import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Currency } from '../shared/enums/currency.enum';
import { round2 } from '../shared/money';
import { productPriceFields } from './dto/product-price.dto';
import { ProductPrice } from './entities/product-price.entity';
import { computeMarkup } from './markup';

export interface CreatePriceInput {
  variantId: number;
  currency: Currency;
  price: number;
  date: string;
  cost?: number | null;
  note?: string | null;
}

export interface PriceListRow {
  variant: ProductVariant;
  price: ProductPrice | null;
}

@Injectable()
export class ProductPricesService {
  constructor(
    @InjectRepository(ProductPrice)
    private readonly repo: Repository<ProductPrice>,
    @InjectRepository(ProductVariant)
    private readonly variants: Repository<ProductVariant>,
    private readonly rates: ExchangeRatesService,
  ) {}

  async list(asOf?: unknown, productId?: number): Promise<PriceListRow[]> {
    const date = this.resolveDate(asOf);
    const where = productId === undefined ? {} : { productId };
    const [variants, prices] = await Promise.all([
      this.variants.find({
        where: { isActive: true, product: { isActive: true }, ...where },
        relations: { product: true, size: true, color: true, color2: true },
        order: { product: { name: 'ASC' }, size: { sortOrder: 'ASC' } },
      }),
      this.currentPrices(date),
    ]);

    const byVariant = new Map(prices.map((p) => [p.variantId, p]));
    return variants.map((variant) => ({
      variant,
      price: byVariant.get(variant.id) ?? null,
    }));
  }

  async history(variantId: number): Promise<ProductPrice[]> {
    await this.requireVariant(variantId);
    return this.repo.find({
      where: { variantId },
      order: { date: 'DESC', id: 'DESC' },
    });
  }

  async create(
    dto: CreatePriceInput,
    createdBy: number,
  ): Promise<ProductPrice> {
    const date = dto.date;
    await this.requireVariant(dto.variantId);
    const rate = await this.rates.findEffective(date);

    const price = round2(dto.price);
    const cost = dto.cost == null ? null : round2(dto.cost);
    const markup = computeMarkup(price, cost);

    return this.repo.save(
      this.repo.create({
        variantId: dto.variantId,
        date,
        currency: dto.currency,
        price: price.toFixed(2),
        rate: rate.rate,
        cost: cost === null ? null : cost.toFixed(2),
        markupFixed: markup.fixed === null ? null : markup.fixed.toFixed(2),
        markupPercent:
          markup.percent === null ? null : markup.percent.toFixed(2),
        note: dto.note ?? null,
        createdBy,
      }),
    );
  }

  private currentPrices(asOf: string): Promise<ProductPrice[]> {
    return this.repo
      .createQueryBuilder('p')
      .distinctOn(['p.variantId'])
      .where('p.date <= :asOf', { asOf })
      .orderBy('p.variantId', 'ASC')
      .addOrderBy('p.date', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .getMany();
  }

  private resolveDate(asOf: unknown): string {
    if (
      typeof asOf !== 'string' ||
      !productPriceFields.date.safeParse(asOf).success
    ) {
      throw new BadRequestException(
        'date is required and must be a calendar date, YYYY-MM-DD',
      );
    }
    return asOf;
  }

  private async requireVariant(id: number): Promise<void> {
    if (!(await this.variants.existsBy({ id }))) {
      throw new NotFoundException(`Variant ${id} not found`);
    }
  }
}
