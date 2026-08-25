import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Not, Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { rethrowAsConflict } from '../shared/db-errors';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly repo: Repository<Brand>,
  ) {}

  findAll(includeInactive = false): Promise<Brand[]> {
    return this.repo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Brand> {
    const row = await this.repo.findOneBy({ id });
    if (!row) {
      throw new NotFoundException('Brand not found');
    }
    return row;
  }

  async create(dto: DeepPartial<Brand>): Promise<Brand> {
    await this.assertNameFree(dto.name as string);
    try {
      return await this.repo.save(this.repo.create(dto));
    } catch (error) {
      rethrowAsConflict(error, 'Brand already exists');
    }
  }

  async update(id: number, dto: DeepPartial<Brand>): Promise<Brand> {
    const current = await this.findOne(id);
    if (Object.keys(dto).length === 0) {
      return current;
    }
    if (dto.name !== undefined) {
      await this.assertNameFree(dto.name, id);
    }
    try {
      await this.repo.update(id, dto);
    } catch (error) {
      rethrowAsConflict(error, 'Brand already exists');
    }
    return this.findOne(id);
  }

  private async assertNameFree(name: string, exceptId?: number): Promise<void> {
    const where: FindOptionsWhere<Brand> = { name };
    if (exceptId !== undefined) {
      where.id = Not(exceptId);
    }
    if (await this.repo.existsBy(where)) {
      throw new ConflictException('Brand name already in use');
    }
  }
}
