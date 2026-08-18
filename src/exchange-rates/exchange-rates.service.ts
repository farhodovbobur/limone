import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ExchangeRate, RateSource } from './entities/exchange-rate.entity';

@Injectable()
export class ExchangeRatesService {
  constructor(
    @InjectRepository(ExchangeRate)
    private readonly repo: Repository<ExchangeRate>,
  ) {}

  findAll(limit = 90): Promise<ExchangeRate[]> {
    return this.repo.find({ order: { date: 'DESC' }, take: limit });
  }

  async findOne(id: number): Promise<ExchangeRate> {
    const row = await this.repo.findOneBy({ id });
    if (!row) {
      throw new NotFoundException('Exchange rate not found');
    }
    return row;
  }

  async findEffective(date: string): Promise<ExchangeRate> {
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
    return this.repo.save(
      this.repo.create({
        date: dto.date,
        rate: String(dto.rate),
        source,
      }),
    );
  }

  async update(id: number, dto: { rate: number }): Promise<ExchangeRate> {
    await this.findOne(id);
    await this.repo.update(id, { rate: String(dto.rate) });
    return this.findOne(id);
  }
}
