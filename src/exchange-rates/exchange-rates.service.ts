import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { rethrowAsConflict } from '../shared/db-errors';
import { exchangeRateFields } from './dto/exchange-rate.dto';
import { ExchangeRate, RateSource } from './entities/exchange-rate.entity';

@Injectable()
export class ExchangeRatesService {
  constructor(
    @InjectRepository(ExchangeRate)
    private readonly repo: Repository<ExchangeRate>,
  ) {}

  findAll(limit = 90): Promise<ExchangeRate[]> {
    const take = Math.min(Math.max(limit, 1), 365);
    return this.repo.find({ order: { date: 'DESC' }, take });
  }

  async findOne(id: number): Promise<ExchangeRate> {
    const row = await this.repo.findOneBy({ id });
    if (!row) {
      throw new NotFoundException('Exchange rate not found');
    }
    return row;
  }

  async findEffective(date: string): Promise<ExchangeRate> {
    if (!exchangeRateFields.date.safeParse(date).success) {
      throw new BadRequestException('date must be a calendar date, YYYY-MM-DD');
    }
    const row = await this.repo.findOne({
      where: { date: LessThanOrEqual(date) },
      order: { date: 'DESC' },
    });
    if (!row) {
      throw new NotFoundException(
        `No exchange rate on or before ${date} — enter one before pricing anything`,
      );
    }
    return row;
  }

  async create(
    dto: { date: string; rate: number },
    source: RateSource = RateSource.MANUAL,
  ): Promise<ExchangeRate> {
    if (await this.repo.existsBy({ date: dto.date })) {
      throw new ConflictException(`A rate for ${dto.date} already exists`);
    }
    try {
      return await this.repo.save(
        this.repo.create({
          date: dto.date,
          rate: String(dto.rate),
          source,
        }),
      );
    } catch (error) {
      rethrowAsConflict(error, `A rate for ${dto.date} already exists`);
    }
  }

  async update(id: number, dto: { rate: number }): Promise<ExchangeRate> {
    await this.findOne(id);
    await this.repo.update(id, { rate: String(dto.rate) });
    return this.findOne(id);
  }
}
