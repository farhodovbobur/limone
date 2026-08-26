import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Currency } from '../shared/enums/currency.enum';
import { round2 } from '../shared/money';
import { ProductPrice } from './entities/product-price.entity';
import { computeMarkup } from './markup';

export interface CreatePriceInput {
  variantId: number;
  currency: Currency;
  price: number;
  date: string;
  cost: number;
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

  async list(asOf: string, productId?: number): Promise<PriceListRow[]> {
    const where = productId === undefined ? {} : { productId };
    const [variants, prices] = await Promise.all([
      this.variants.find({
        where: { isActive: true, product: { isActive: true }, ...where },
        relations: { product: true, size: true, color: true, color2: true },
        order: { product: { name: 'ASC' }, size: { sortOrder: 'ASC' } },
      }),
      this.currentPrices(asOf, productId),
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

    const price = round2(dto.price);
    const cost = round2(dto.cost);
    const markup = computeMarkup(price, cost);

    return this.repo.save(
      this.repo.create({
        variantId: dto.variantId,
        date,
        currency: dto.currency,
        price: price.toFixed(2),
        rate: await this.rateOn(date),
        cost: cost.toFixed(2),
        markupFixed: markup.fixed === null ? null : markup.fixed.toFixed(2),
        markupPercent:
          markup.percent === null ? null : markup.percent.toFixed(2),
        note: dto.note ?? null,
        createdBy,
      }),
    );
  }

  private async rateOn(date: string): Promise<string | null> {
    try {
      return (await this.rates.findEffective(date)).rate;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  private currentPrices(
    asOf: string,
    productId?: number,
  ): Promise<ProductPrice[]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .distinctOn(['p.variantId'])
      .where('p.date <= :asOf', { asOf })
      .orderBy('p.variantId', 'ASC')
      .addOrderBy('p.date', 'DESC')
      .addOrderBy('p.id', 'DESC');

    if (productId !== undefined) {
      qb.innerJoin('p.variant', 'v').andWhere('v.product_id = :productId', {
        productId,
      });
    }
    return qb.getMany();
  }

  private async requireVariant(id: number): Promise<void> {
    if (!(await this.variants.existsBy({ id }))) {
      throw new NotFoundException(`Variant ${id} not found`);
    }
  }
}
