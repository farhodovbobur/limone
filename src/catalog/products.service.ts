import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Not, Repository } from 'typeorm';
import { DEFAULT_LOCALE, Translations } from '../shared/i18n/locales';
import { ProductCategory } from './entities/product-category.entity';
import { Product } from './entities/product.entity';
import { isUniqueViolation } from './reference.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly categories: Repository<ProductCategory>,
  ) {}

  /** `category` is joined because the list column shows its name. */
  findAll(includeInactive = false, categoryId?: number): Promise<Product[]> {
    const where: FindOptionsWhere<Product> = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (categoryId !== undefined) {
      where.categoryId = categoryId;
    }
    return this.repo.find({
      where,
      relations: { category: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const row = await this.repo.findOneBy({ id });
    if (!row) {
      throw new NotFoundException('Product not found');
    }
    return row;
  }

  async create(dto: DeepPartial<Product>): Promise<Product> {
    const name = dto.name as string;
    await this.assertNameFree(name);
    await this.assertCodeFree(dto.code);
    await this.requireCategory(dto.categoryId);
    try {
      return await this.repo.save(this.repo.create(this.defaultUz(dto, name)));
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(id: number, dto: DeepPartial<Product>): Promise<Product> {
    const current = await this.findOne(id);
    if (Object.keys(dto).length === 0) {
      return current;
    }
    if (dto.name !== undefined) {
      await this.assertNameFree(dto.name, id);
    }
    if (dto.code !== undefined) {
      await this.assertCodeFree(dto.code, id);
    }
    if (dto.categoryId !== undefined) {
      await this.requireCategory(dto.categoryId);
    }
    const patch =
      dto.translations === undefined
        ? dto
        : this.defaultUz(dto, dto.name ?? current.name);
    try {
      await this.repo.update(id, patch);
    } catch (error) {
      this.rethrowConflict(error);
    }
    return this.findOne(id);
  }

  /** `translations.uz` defaults to `name`; the two may diverge later (D16). */
  private defaultUz(
    dto: DeepPartial<Product>,
    name: string,
  ): DeepPartial<Product> {
    const given = dto.translations as Translations | undefined;
    if (given?.[DEFAULT_LOCALE]) {
      return dto;
    }
    return { ...dto, translations: { ...given, [DEFAULT_LOCALE]: name } };
  }

  private async assertNameFree(name: string, exceptId?: number): Promise<void> {
    const where: FindOptionsWhere<Product> = { name };
    if (exceptId !== undefined) {
      where.id = Not(exceptId);
    }
    if (await this.repo.existsBy(where)) {
      throw new ConflictException('Product name already in use');
    }
  }

  private async assertCodeFree(
    code: string | null | undefined,
    exceptId?: number,
  ): Promise<void> {
    if (code == null) {
      return;
    }
    const where: FindOptionsWhere<Product> = { code };
    if (exceptId !== undefined) {
      where.id = Not(exceptId);
    }
    if (await this.repo.existsBy(where)) {
      throw new ConflictException('Product code already in use');
    }
  }

  private async requireCategory(
    categoryId: number | null | undefined,
  ): Promise<void> {
    if (categoryId == null) {
      return;
    }
    if (!(await this.categories.existsBy({ id: categoryId }))) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }
  }

  private rethrowConflict(error: unknown): never {
    if (isUniqueViolation(error)) {
      throw new ConflictException('Product name or code already in use');
    }
    throw error;
  }
}
