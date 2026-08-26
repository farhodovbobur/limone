import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { isUniqueViolation } from '../shared/db-errors';
import { nextDocumentNumber } from './document-number';
import { WarehouseProductBalance } from './entities/warehouse-product-balance.entity';
import {
  DocumentType,
  WarehouseProductDocument,
} from './entities/warehouse-product-document.entity';
import { WarehouseProductMovement } from './entities/warehouse-product-movement.entity';

/** The namespace half of every advisory lock this subsystem takes. */
const LOCK_NAMESPACE = 4242;

const NUMBER_PREFIX: Record<DocumentType, string> = {
  [DocumentType.OPENING]: 'OPN',
  [DocumentType.ISSUE]: 'ISS',
  [DocumentType.ADJUSTMENT]: 'ADJ',
  [DocumentType.REVERSAL]: 'REV',
};

export interface MovementLine {
  variantId: number;
  qty: number;
}

export interface PostInput {
  type: DocumentType;
  date: string;
  clientRef?: string | null;
  note?: string | null;
  reversesDocumentId?: number | null;
  lines: MovementLine[];
}

export interface PostedDocument {
  document: WarehouseProductDocument;
  movements: WarehouseProductMovement[];
  replayed: boolean;
}

const fingerprint = (lines: MovementLine[]): string =>
  lines
    .map((l) => `${l.variantId}:${l.qty}`)
    .sort()
    .join('|');

@Injectable()
export class WarehouseLedgerService {
  constructor(
    @InjectRepository(WarehouseProductDocument)
    private readonly documents: Repository<WarehouseProductDocument>,
    private readonly dataSource: DataSource,
  ) {}

  async post(
    input: PostInput,
    createdBy: number,
    em?: EntityManager,
  ): Promise<PostedDocument> {
    if (em) {
      return this.writeOnce(em, input, createdBy);
    }

    try {
      return await this.dataSource.transaction((tx) =>
        this.writeOnce(tx, input, createdBy),
      );
    } catch (error) {
      if (input.clientRef && isUniqueViolation(error)) {
        const replayed = await this.replay(this.documents.manager, input);
        if (replayed) {
          return replayed;
        }
      }
      throw error;
    }
  }

  private async writeOnce(
    em: EntityManager,
    input: PostInput,
    createdBy: number,
  ): Promise<PostedDocument> {
    if (input.clientRef) {
      const replayed = await this.replay(em, input);
      if (replayed) {
        return replayed;
      }
    }
    return this.write(em, input, createdBy);
  }

  async replay(
    em: EntityManager,
    input: PostInput,
  ): Promise<PostedDocument | null> {
    const existing = await em.findOne(WarehouseProductDocument, {
      where: { clientRef: input.clientRef! },
    });
    if (!existing) {
      return null;
    }
    const movements = await this.movementsOf(em, existing.id);
    if (
      existing.type !== input.type ||
      existing.date !== input.date ||
      fingerprint(movements) !== fingerprint(input.lines)
    ) {
      throw new ConflictException(
        `Reference ${input.clientRef} already belongs to ${existing.number}, which is not this document`,
      );
    }
    return { document: existing, movements, replayed: true };
  }

  private async write(
    em: EntityManager,
    input: PostInput,
    createdBy: number,
  ): Promise<PostedDocument> {
    await this.lockVariants(
      em,
      input.lines.map((l) => l.variantId),
    );

    const balances = await this.balancesOf(
      em,
      input.lines.map((l) => l.variantId),
    );
    this.assertNoNegativeStock(input.lines, balances);

    const document = await em.save(
      em.create(WarehouseProductDocument, {
        number: await nextDocumentNumber(
          em,
          NUMBER_PREFIX[input.type],
          input.date,
        ),
        type: input.type,
        date: input.date,
        clientRef: input.clientRef ?? null,
        note: input.note ?? null,
        reversesDocumentId: input.reversesDocumentId ?? null,
        createdBy,
      }),
    );

    const rows = input.lines.map((line) => {
      balances.set(
        line.variantId,
        (balances.get(line.variantId) ?? 0) + line.qty,
      );
      return em.create(WarehouseProductMovement, {
        documentId: document.id,
        variantId: line.variantId,
        qty: line.qty,
      });
    });

    const movements = await em.save(WarehouseProductMovement, rows);
    await this.writeBalances(em, balances);
    return { document, movements, replayed: false };
  }

  async lockVariants(em: EntityManager, variantIds: number[]): Promise<void> {
    const ids = [...new Set(variantIds)].sort((a, b) => a - b);
    for (const id of ids) {
      await em.query('SELECT pg_advisory_xact_lock($1, $2)', [
        LOCK_NAMESPACE,
        id,
      ]);
    }
  }

  private assertNoNegativeStock(
    lines: MovementLine[],
    balances: Map<number, number>,
  ): void {
    const wanted = new Map<number, number>();
    for (const line of lines) {
      wanted.set(line.variantId, (wanted.get(line.variantId) ?? 0) + line.qty);
    }

    const failing: string[] = [];
    for (const [variantId, delta] of wanted) {
      const have = balances.get(variantId) ?? 0;
      if (have + delta < 0) {
        failing.push(
          `variant ${variantId}: have ${have}, this document takes ${-delta}`,
        );
      }
    }
    if (failing.length) {
      throw new ConflictException(
        `Stock would go negative — ${failing.join('; ')}`,
      );
    }
  }

  async balancesOf(
    em: EntityManager,
    variantIds: number[],
  ): Promise<Map<number, number>> {
    const ids = [...new Set(variantIds)];
    const rows = await em
      .createQueryBuilder(WarehouseProductBalance, 'b')
      .where('b.variant_id IN (:...ids)', { ids })
      .getMany();
    return new Map(rows.map((r) => [r.variantId, r.qty]));
  }

  private async writeBalances(
    em: EntityManager,
    balances: Map<number, number>,
  ): Promise<void> {
    const updatedAt = new Date();
    const rows = [...balances].map(([variantId, qty]) => ({
      variantId,
      qty,
      updatedAt,
    }));
    await em.upsert(WarehouseProductBalance, rows, ['variantId']);
  }

  private movementsOf(
    em: EntityManager,
    documentId: number,
  ): Promise<WarehouseProductMovement[]> {
    return em.find(WarehouseProductMovement, {
      where: { documentId },
      order: { id: 'ASC' },
    });
  }
}
