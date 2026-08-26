import { Injectable, NotFoundException } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { rethrowAsConflict } from '../shared/db-errors';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { WarehouseProductBalance } from './entities/warehouse-product-balance.entity';
import {
  DocumentType,
  WarehouseProductDocument,
} from './entities/warehouse-product-document.entity';
import { WarehouseProductMovement } from './entities/warehouse-product-movement.entity';
import {
  PostedDocument,
  WarehouseLedgerService,
} from './warehouse-ledger.service';

export interface ShelfLine {
  variantId: number;
  qty: number;
}

export interface CountedLine {
  variantId: number;
  countedQty: number;
}

export interface HistoryFilter {
  variantId?: number;
  limit?: number;
  offset?: number;
}

export interface BalanceFilter {
  productId?: number;
  variantId?: number;
  limit?: number;
  offset?: number;
}

@Injectable()
export class WarehouseProductService {
  constructor(
    private readonly ledger: WarehouseLedgerService,
    private readonly dataSource: DataSource,
    @InjectRepository(WarehouseProductMovement)
    private readonly movements: Repository<WarehouseProductMovement>,
    @InjectRepository(WarehouseProductBalance)
    private readonly balances: Repository<WarehouseProductBalance>,
    @InjectRepository(WarehouseProductDocument)
    private readonly documents: Repository<WarehouseProductDocument>,
    @InjectRepository(ProductVariant)
    private readonly variants: Repository<ProductVariant>,
  ) {}

  async opening(
    dto: {
      date: string;
      clientRef?: string | null;
      note?: string | null;
      lines: ShelfLine[];
    },
    createdBy: number,
  ): Promise<PostedDocument> {
    await this.requireVariants(
      dto.lines.map((l) => l.variantId),
      true,
    );
    return this.ledger.post(
      {
        type: DocumentType.OPENING,
        date: dto.date,
        clientRef: dto.clientRef,
        note: dto.note,
        lines: dto.lines,
      },
      createdBy,
    );
  }

  async issue(
    dto: {
      date: string;
      clientRef?: string | null;
      note?: string | null;
      lines: ShelfLine[];
    },
    createdBy: number,
  ): Promise<PostedDocument> {
    await this.requireVariants(dto.lines.map((l) => l.variantId));
    return this.ledger.post(
      {
        type: DocumentType.ISSUE,
        date: dto.date,
        clientRef: dto.clientRef,
        note: dto.note,
        lines: dto.lines.map((l) => ({ ...l, qty: -l.qty })),
      },
      createdBy,
    );
  }

  async count(
    dto: {
      date: string;
      clientRef?: string | null;
      note?: string | null;
      lines: CountedLine[];
    },
    createdBy: number,
  ): Promise<PostedDocument | null> {
    const variantIds = dto.lines.map((l) => l.variantId);
    await this.requireVariants(variantIds);

    try {
      return await this.dataSource.transaction(async (em) => {
        await this.ledger.lockVariants(em, variantIds);
        const current = await this.ledger.balancesOf(em, variantIds);

        const lines = dto.lines
          .map((l) => ({
            variantId: l.variantId,
            qty: l.countedQty - (current.get(l.variantId) ?? 0),
          }))
          .filter((l) => l.qty !== 0);

        if (!lines.length) {
          return null;
        }

        return this.ledger.post(
          {
            type: DocumentType.ADJUSTMENT,
            date: dto.date,
            clientRef: dto.clientRef,
            note: dto.note,
            lines,
          },
          createdBy,
          em,
        );
      });
    } catch (error) {
      if (dto.clientRef) {
        rethrowAsConflict(
          error,
          `Reference ${dto.clientRef} already belongs to another document`,
        );
      }
      throw error;
    }
  }

  async reverse(
    dto: { documentId: number; date: string; note?: string | null },
    createdBy: number,
  ): Promise<PostedDocument> {
    const documentId = dto.documentId;
    const document = await this.documents.findOneBy({ id: documentId });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    if (document.type === DocumentType.REVERSAL) {
      throw new ConflictException('A reversal cannot itself be reversed');
    }
    if (await this.documents.existsBy({ reversesDocumentId: document.id })) {
      throw new ConflictException(
        `Document ${document.number} has already been reversed`,
      );
    }

    const original = await this.movements.find({
      where: { documentId },
      order: { id: 'ASC' },
    });

    try {
      return await this.ledger.post(
        {
          type: DocumentType.REVERSAL,
          date: dto.date,
          note: dto.note ?? `Reversal of ${document.number}`,
          reversesDocumentId: document.id,
          lines: original.map((m) => ({ variantId: m.variantId, qty: -m.qty })),
        },
        createdBy,
      );
    } catch (error) {
      rethrowAsConflict(
        error,
        `Document ${document.number} has already been reversed`,
      );
    }
  }

  async history(
    filter: HistoryFilter,
  ): Promise<{ rows: WarehouseProductMovement[]; total: number }> {
    const qb = this.movements
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.document', 'document')
      .orderBy('m.id', 'DESC');

    if (filter.variantId !== undefined) {
      qb.andWhere('m.variant_id = :variantId', { variantId: filter.variantId });
    }

    const [rows, total] = await qb
      .take(Math.min(Math.max(filter.limit ?? 50, 1), 200))
      .skip(Math.max(filter.offset ?? 0, 0))
      .getManyAndCount();
    return { rows, total };
  }

  async balanceList(
    filter: BalanceFilter,
  ): Promise<{ rows: WarehouseProductBalance[]; total: number }> {
    const qb = this.balances
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.variant', 'variant')
      .innerJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.size', 'size')
      .leftJoinAndSelect('variant.color', 'color')
      .leftJoinAndSelect('variant.color2', 'color2')
      .orderBy('product.name', 'ASC')
      .addOrderBy('b.variant_id', 'ASC');

    if (filter.productId !== undefined) {
      qb.andWhere('variant.product_id = :productId', {
        productId: filter.productId,
      });
    }
    if (filter.variantId !== undefined) {
      qb.andWhere('b.variant_id = :variantId', { variantId: filter.variantId });
    }

    const [rows, total] = await qb
      .take(Math.min(Math.max(filter.limit ?? 50, 1), 200))
      .skip(Math.max(filter.offset ?? 0, 0))
      .getManyAndCount();
    return { rows, total };
  }

  async balanceOf(
    variantId: number,
  ): Promise<{ variantId: number; qty: number }> {
    await this.requireVariants([variantId]);
    const row = await this.balances.findOneBy({ variantId });
    return { variantId, qty: row?.qty ?? 0 };
  }

  private async requireVariants(
    ids: number[],
    mustBeActive = false,
  ): Promise<void> {
    const wanted = [...new Set(ids)];
    const found = await this.variants
      .createQueryBuilder('v')
      .select(['v.id AS id', 'v.is_active AS "isActive"'])
      .where('v.id IN (:...wanted)', { wanted })
      .getRawMany<{ id: number; isActive: boolean }>();
    const known = new Map(found.map((r) => [r.id, r.isActive]));
    const missing = wanted.find((id) => !known.has(id));
    if (missing !== undefined) {
      throw new NotFoundException(`Variant ${missing} not found`);
    }
    if (!mustBeActive) {
      return;
    }
    const retired = wanted.find((id) => known.get(id) === false);
    if (retired !== undefined) {
      throw new ConflictException(
        `Variant ${retired} is discontinued — reactivate it before receiving stock`,
      );
    }
  }
}
