import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Color } from './entities/color.entity';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Size } from './entities/size.entity';
import { isUniqueViolation } from './reference.service';
import { buildSku, uniqueSku } from './sku';

export interface VariantFilter {
  productId?: number;
  sizeId?: number;
  colorId?: number;
  includeInactive?: boolean;
}

export interface ColorPair {
  colorId: number;
  color2Id?: number | null;
}

export interface MatrixResult {
  created: number;
  skipped: number;
  variants: ProductVariant[];
}

const identity = (sizeId: number, colorId: number, color2Id?: number | null) =>
  `${sizeId}:${colorId}:${color2Id ?? ''}`;

@Injectable()
export class ProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly repo: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(Size)
    private readonly sizes: Repository<Size>,
    @InjectRepository(Color)
    private readonly colors: Repository<Color>,
  ) {}

  list(filter: VariantFilter = {}): Promise<ProductVariant[]> {
    const qb = this.repo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.product', 'product')
      .leftJoinAndSelect('v.size', 'size')
      .leftJoinAndSelect('v.color', 'color')
      .leftJoinAndSelect('v.color2', 'color2')
      .orderBy('product.name', 'ASC')
      .addOrderBy('size.sortOrder', 'ASC');

    if (!filter.includeInactive) {
      qb.andWhere('v.is_active = true');
    }
    if (filter.productId !== undefined) {
      qb.andWhere('v.product_id = :productId', { productId: filter.productId });
    }
    if (filter.sizeId !== undefined) {
      qb.andWhere('v.size_id = :sizeId', { sizeId: filter.sizeId });
    }
    if (filter.colorId !== undefined) {
      qb.andWhere('(v.color_id = :colorId OR v.color2_id = :colorId)', {
        colorId: filter.colorId,
      });
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<ProductVariant> {
    const row = await this.repo.findOne({
      where: { id },
      relations: { product: true, size: true, color: true, color2: true },
    });
    if (!row) {
      throw new NotFoundException('Variant not found');
    }
    return row;
  }

  async create(dto: {
    productId: number;
    sizeId: number;
    colorId: number;
    color2Id?: number | null;
    sku?: string;
    minStock?: number;
    isActive?: boolean;
  }): Promise<ProductVariant> {
    this.assertDistinctColours(dto);
    const [product, sizes, colors] = await Promise.all([
      this.requireProduct(dto.productId),
      this.requireSizes([dto.sizeId]),
      this.requireColors(
        [dto.colorId, dto.color2Id].filter((v): v is number => v != null),
      ),
    ]);

    if (
      await this.exists(dto.productId, dto.sizeId, dto.colorId, dto.color2Id)
    ) {
      throw new ConflictException(
        'That size and colour already exists for this product',
      );
    }

    let sku: string;
    if (dto.sku !== undefined) {
      if (await this.repo.existsBy({ sku: dto.sku })) {
        throw new ConflictException(`SKU ${dto.sku} is already in use`);
      }
      sku = dto.sku;
    } else {
      sku = await this.generateSku(
        product,
        sizes.get(dto.sizeId)!.name,
        colors.get(dto.colorId)!.name,
        dto.color2Id != null ? colors.get(dto.color2Id)!.name : null,
      );
    }

    try {
      const saved = await this.repo.save(
        this.repo.create({
          productId: dto.productId,
          sizeId: dto.sizeId,
          colorId: dto.colorId,
          color2Id: dto.color2Id ?? null,
          sku,
          minStock: dto.minStock ?? 0,
          isActive: dto.isActive ?? true,
        }),
      );
      return await this.findOne(saved.id);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(
    id: number,
    dto: { sku?: string; minStock?: number; isActive?: boolean },
  ): Promise<ProductVariant> {
    const current = await this.findOne(id);
    if (Object.keys(dto).length === 0) {
      return current;
    }
    if (dto.sku !== undefined) {
      const clash = await this.repo.findOneBy({ sku: dto.sku });
      if (clash && clash.id !== id) {
        throw new ConflictException(`SKU ${dto.sku} is already in use`);
      }
    }
    try {
      await this.repo.update(id, dto);
    } catch (error) {
      this.rethrowConflict(error);
    }
    return this.findOne(id);
  }

  async createMatrix(dto: {
    productId: number;
    sizeIds: number[];
    colors: ColorPair[];
  }): Promise<MatrixResult> {
    for (const pair of dto.colors) {
      this.assertDistinctColours(pair);
    }
    const [product, sizes, colors] = await Promise.all([
      this.requireProduct(dto.productId),
      this.requireSizes(dto.sizeIds),
      this.requireColors(
        dto.colors.flatMap((c) =>
          [c.colorId, c.color2Id].filter((v): v is number => v != null),
        ),
      ),
    ]);

    const existing = new Set(
      (
        await this.repo.find({
          where: { productId: dto.productId },
          select: { sizeId: true, colorId: true, color2Id: true },
        })
      ).map((v) => identity(v.sizeId, v.colorId, v.color2Id)),
    );
    const pendingKeys = new Set<string>();
    const pendingSkus = new Set<string>();
    const rows: ProductVariant[] = [];
    let skipped = 0;

    for (const sizeId of dto.sizeIds) {
      for (const pair of dto.colors) {
        const key = identity(sizeId, pair.colorId, pair.color2Id);
        if (existing.has(key) || pendingKeys.has(key)) {
          skipped += 1;
          continue;
        }
        pendingKeys.add(key);
        const sku = await this.generateSku(
          product,
          sizes.get(sizeId)!.name,
          colors.get(pair.colorId)!.name,
          pair.color2Id != null ? colors.get(pair.color2Id)!.name : null,
          pendingSkus,
        );
        pendingSkus.add(sku);
        rows.push(
          this.repo.create({
            productId: dto.productId,
            sizeId,
            colorId: pair.colorId,
            color2Id: pair.color2Id ?? null,
            sku,
          }),
        );
      }
    }

    try {
      const variants = rows.length ? await this.repo.save(rows) : [];
      return { created: variants.length, skipped, variants };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A concurrent writer created one of these variants — re-run the matrix, existing rows are skipped',
        );
      }
      throw error;
    }
  }

  private generateSku(
    product: Product,
    sizeName: string,
    colorName: string,
    color2Name: string | null,
    pendingSkus?: Set<string>,
  ): Promise<string> {
    return uniqueSku(
      buildSku({
        productCode: product.code,
        productName: product.name,
        sizeName,
        colorName,
        color2Name,
      }),
      async (candidate) =>
        pendingSkus?.has(candidate) === true ||
        (await this.repo.existsBy({ sku: candidate })),
    );
  }

  private assertDistinctColours(pair: ColorPair): void {
    if (pair.color2Id != null && pair.color2Id === pair.colorId) {
      throw new BadRequestException(
        'A two-colour garment needs two different colours',
      );
    }
  }

  private rethrowConflict(error: unknown): never {
    if (isUniqueViolation(error)) {
      throw new ConflictException('That variant or SKU already exists');
    }
    throw error;
  }

  private exists(
    productId: number,
    sizeId: number,
    colorId: number,
    color2Id?: number | null,
  ): Promise<boolean> {
    return this.repo.existsBy({
      productId,
      sizeId,
      colorId,
      color2Id: color2Id ?? IsNull(),
    });
  }

  private async requireProduct(id: number): Promise<Product> {
    const product = await this.products.findOneBy({ id });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async requireSizes(ids: number[]): Promise<Map<number, Size>> {
    return this.requireAll(this.sizes, ids, 'Size');
  }

  private async requireColors(ids: number[]): Promise<Map<number, Color>> {
    return this.requireAll(this.colors, ids, 'Colour');
  }

  private async requireAll<T extends { id: number }>(
    repo: Repository<T>,
    ids: number[],
    label: string,
  ): Promise<Map<number, T>> {
    const wanted = [...new Set(ids)];
    if (!wanted.length) {
      return new Map();
    }
    const rows = await repo.find({
      where: { id: In(wanted) } as never,
    });
    const found = new Map(rows.map((r) => [r.id, r]));
    const missing = wanted.find((id) => !found.has(id));
    if (missing !== undefined) {
      throw new NotFoundException(`${label} ${missing} not found`);
    }
    return found;
  }
}
