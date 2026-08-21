import { ConflictException, NotFoundException } from '@nestjs/common';
import { DEFAULT_LOCALE, Translations } from '../shared/i18n/locales';
import {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsWhere,
  Not,
  QueryDeepPartialEntity,
  QueryFailedError,
  Repository,
} from 'typeorm';

/** What the small lookup tables have in common. */
export interface ReferenceRow {
  id: number;
  name: string;
  translations: Translations;
  isActive: boolean;
}

/** True for PostgreSQL's unique-constraint violation. */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string }).code === '23505';

export const violatedTable = (error: unknown): string | undefined =>
  error instanceof QueryFailedError
    ? (error.driverError as { table?: string }).table
    : undefined;

export function rethrowAsConflict(error: unknown, message: string): never {
  if (isUniqueViolation(error)) {
    throw new ConflictException(message);
  }
  throw error;
}

export abstract class ReferenceService<T extends ReferenceRow> {
  protected constructor(
    protected readonly repo: Repository<T>,
    protected readonly label: string,
    protected readonly order: FindOptionsOrder<T>,
  ) {}

  findAll(includeInactive = false): Promise<T[]> {
    return this.repo.find({
      where: includeInactive ? {} : ({ isActive: true } as FindOptionsWhere<T>),
      order: this.order,
    });
  }

  async findOne(id: number): Promise<T> {
    const row = await this.repo.findOneBy({ id } as FindOptionsWhere<T>);
    if (!row) {
      throw new NotFoundException(`${this.label} not found`);
    }
    return row;
  }

  async create(dto: DeepPartial<T>): Promise<T> {
    const name = dto.name as string;
    await this.assertNameFree(name);
    try {
      return await this.repo.save(this.repo.create(this.defaultUz(dto, name)));
    } catch (error) {
      rethrowAsConflict(error, `${this.label} already exists`);
    }
  }

  async update(id: number, dto: DeepPartial<T>): Promise<T> {
    const current = await this.findOne(id);
    if (Object.keys(dto).length === 0) {
      return current;
    }
    if (dto.name !== undefined) {
      await this.assertNameFree(dto.name, id);
    }
    const patch =
      dto.translations === undefined
        ? dto
        : this.defaultUz(dto, dto.name ?? current.name);
    try {
      await this.repo.update(id, patch as QueryDeepPartialEntity<T>);
    } catch (error) {
      rethrowAsConflict(error, `${this.label} already exists`);
    }
    return this.findOne(id);
  }

  private defaultUz(dto: DeepPartial<T>, name: string): DeepPartial<T> {
    const given = dto.translations as Translations | undefined;
    if (given?.[DEFAULT_LOCALE]) {
      return dto;
    }
    return {
      ...dto,
      translations: { ...given, [DEFAULT_LOCALE]: name },
    };
  }

  private async assertNameFree(name: string, exceptId?: number): Promise<void> {
    const where = { name } as FindOptionsWhere<T>;
    if (exceptId !== undefined) {
      Object.assign(where, { id: Not(exceptId) });
    }
    if (await this.repo.existsBy(where)) {
      throw new ConflictException(`${this.label} name already in use`);
    }
  }
}
