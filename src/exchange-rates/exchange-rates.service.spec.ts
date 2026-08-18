import { ConflictException, NotFoundException } from '@nestjs/common';
import { FindOneOptions, LessThanOrEqual, Repository } from 'typeorm';
import { ExchangeRate, RateSource } from './entities/exchange-rate.entity';
import { ExchangeRatesService } from './exchange-rates.service';

type RepoMock = {
  find: jest.Mock;
  // Typed so the call-argument assertion below needs no cast.
  findOne: jest.Mock<
    Promise<ExchangeRate | null>,
    [FindOneOptions<ExchangeRate>]
  >;
  findOneBy: jest.Mock;
  existsBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
};

function makeService() {
  const repo: RepoMock = {
    find: jest.fn(),
    findOne: jest.fn<
      Promise<ExchangeRate | null>,
      [FindOneOptions<ExchangeRate>]
    >(),
    findOneBy: jest.fn(),
    existsBy: jest.fn(),
    // `create` is a pass-through in TypeORM; the test only cares what reaches it.
    create: jest.fn((row: Partial<ExchangeRate>) => row),
    save: jest.fn((row: Partial<ExchangeRate>) => row),
    update: jest.fn(),
  };
  const service = new ExchangeRatesService(
    repo as unknown as Repository<ExchangeRate>,
  );
  return { service, repo };
}

const row = (date: string, rate = '12650.00'): ExchangeRate =>
  ({ id: 1, date, rate, source: RateSource.MANUAL }) as ExchangeRate;

describe('ExchangeRatesService', () => {
  describe('findEffective', () => {
    it('asks for the latest rate dated on or before the day', async () => {
      const { service, repo } = makeService();
      repo.findOne.mockResolvedValue(row('2026-08-14'));

      await service.findEffective('2026-08-16');

      const [options] = repo.findOne.mock.calls[0];
      expect(options.where).toEqual({ date: LessThanOrEqual('2026-08-16') });
      expect(options.order).toEqual({ date: 'DESC' });
    });

    it('returns Friday rate for a Sunday — the gap is the whole point', async () => {
      const { service, repo } = makeService();
      repo.findOne.mockResolvedValue(row('2026-08-14', '12600.00'));

      await expect(service.findEffective('2026-08-16')).resolves.toMatchObject({
        date: '2026-08-14',
        rate: '12600.00',
      });
    });

    it('names the requested date when no rate exists yet', async () => {
      const { service, repo } = makeService();
      repo.findOne.mockResolvedValue(null);

      // The message is load-bearing: the UI shows it and the admin has to know
      // which day to enter a rate for.
      await expect(service.findEffective('1999-01-01')).rejects.toThrow(
        /1999-01-01/,
      );
      await expect(service.findEffective('1999-01-01')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('rejects a second rate for a day that already has one', async () => {
      const { service, repo } = makeService();
      repo.existsBy.mockResolvedValue(true);

      await expect(
        service.create({ date: '2026-08-17', rate: 12650 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('stamps MANUAL when nothing says otherwise', async () => {
      const { service, repo } = makeService();
      repo.existsBy.mockResolvedValue(false);

      await service.create({ date: '2026-08-17', rate: 12650 });

      expect(repo.create).toHaveBeenCalledWith({
        date: '2026-08-17',
        rate: '12650',
        source: RateSource.MANUAL,
      });
    });

    it('lets a caller declare CBU — the fetch job, never a client', async () => {
      const { service, repo } = makeService();
      repo.existsBy.mockResolvedValue(false);

      await service.create({ date: '2026-08-17', rate: 12650 }, RateSource.CBU);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: RateSource.CBU }),
      );
    });
  });

  describe('update', () => {
    it('writes only the rate, never the date', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(row('2026-08-17'));

      await service.update(1, { rate: 12800 });

      expect(repo.update).toHaveBeenCalledWith(1, { rate: '12800' });
    });

    it('404s before touching anything when the row is gone', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.update(99, { rate: 1 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
