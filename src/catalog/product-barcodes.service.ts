import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasValidCheckDigit, isInternalShape, isValidEan13 } from './barcode';
import { BarcodeType, ProductBarcode } from './entities/product-barcode.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductVariantsService } from './product-variants.service';
import { isUniqueViolation } from './reference.service';

/** Scanners add whitespace and Enter, and case must not matter. Nothing else. */
export const normalizeCode = (raw: string): string => raw.trim().toUpperCase();

const CODE_MAX_LENGTH = 32;

@Injectable()
export class ProductBarcodesService {
  constructor(
    @InjectRepository(ProductBarcode)
    private readonly repo: Repository<ProductBarcode>,
    private readonly variants: ProductVariantsService,
  ) {}

  async resolve(raw: unknown): Promise<ProductVariant> {
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new BadRequestException('code is required');
    }
    const code = normalizeCode(raw);
    const row = await this.repo.findOneBy({ code });
    if (row) {
      return this.variants.findOne(row.variantId);
    }
    if (isInternalShape(code) && !hasValidCheckDigit(code)) {
      throw new BadRequestException(
        'Code looks mistyped — check it and retype',
      );
    }
    throw new NotFoundException(
      `Unknown code ${code} — link it to a variant to learn it`,
    );
  }

  list(variantId: number): Promise<ProductBarcode[]> {
    return this.repo.find({
      where: { variantId },
      order: { createdAt: 'ASC' },
    });
  }

  async learn(
    dto: {
      variantId: number;
      code: string;
      type: BarcodeType;
      note?: string | null;
    },
    createdBy: number,
  ): Promise<ProductBarcode> {
    const code = normalizeCode(dto.code);
    if (code.length > CODE_MAX_LENGTH) {
      throw new BadRequestException(
        `Code is longer than ${CODE_MAX_LENGTH} characters once normalised`,
      );
    }
    if (isInternalShape(code) && hasValidCheckDigit(code)) {
      throw new BadRequestException(
        'That is the shape of our own internal codes and cannot be learned as a supplier code',
      );
    }
    if (dto.type === BarcodeType.EAN13 && !isValidEan13(code)) {
      throw new BadRequestException(
        'An EAN-13 is thirteen digits ending in a valid check digit',
      );
    }
    await this.variants.findOne(dto.variantId);

    const taken = await this.holderMessage(code);
    if (taken) {
      throw new ConflictException(taken);
    }
    try {
      return await this.repo.save(
        this.repo.create({
          variantId: dto.variantId,
          code,
          type: dto.type,
          note: dto.note ?? null,
          createdBy,
        }),
      );
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      throw new ConflictException(
        (await this.holderMessage(code)) ?? 'Code already linked to a variant',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const row = await this.repo.findOneBy({ id });
    if (!row) {
      throw new NotFoundException('Barcode not found');
    }
    if (row.type === BarcodeType.INTERNAL) {
      throw new BadRequestException(
        'Internal codes live and die with their variant',
      );
    }
    await this.repo.delete(id);
  }

  /** "Code already linked to KOY01-M-QORA", or null when the code is free. */
  private async holderMessage(code: string): Promise<string | null> {
    const holder = await this.repo.findOne({
      where: { code },
      relations: { variant: true },
    });
    return holder ? `Code already linked to ${holder.variant.sku}` : null;
  }
}
