import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Currency } from '../shared/enums/currency.enum';
import { ProductPrice } from './entities/product-price.entity';
import { ProductPricesService } from './product-prices.service';

type BuilderMock = {
  distinctOn: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  getMany: jest.Mock;
};

function makeService() {
  const saved: Partial<ProductPrice>[] = [];
  // Declared before the repo that hands it out: every method returns the
  // builder itself, the way the real fluent API does.
  const builder: BuilderMock = {
    distinctOn: jest.fn(() => builder),
    where: jest.fn(() => builder),
    orderBy: jest.fn(() => builder),
    addOrderBy: jest.fn(() => builder),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const repo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((row: Partial<ProductPrice>) => row),
    save: jest.fn((row: Partial<ProductPrice>) => {
      saved.push(row);
      return Promise.resolve(row);
    }),
    createQueryBuilder: jest.fn(() => builder),
  };
  const variants = {
    find: jest.fn().mockResolvedValue([]),
    existsBy: jest.fn().mockResolvedValue(true),
  };
  const rates = {
    findEffective: jest.fn().mockResolvedValue({ rate: '12650.00' }),
  };

  const service = new ProductPricesService(
    repo as unknown as Repository<ProductPrice>,
    variants as unknown as Repository<ProductVariant>,
    rates as unknown as ExchangeRatesService,
  );
  return { service, repo, builder, variants, rates, saved };
}

const input = {
  variantId: 41,
  currency: Currency.UZS,
  price: 114_000,
  cost: 87_500,
  date: '2026-08-20',
};

describe('create', () => {
  it("freezes the day's rate onto the row instead of referencing it", async () => {
    const { service, rates, saved } = makeService();

    await service.create(input, 7);

    expect(rates.findEffective).toHaveBeenCalledWith('2026-08-20');
    expect(saved[0].rate).toBe('12650.00');
  });

  it('computes both markup caches — the client cannot set them', async () => {
    const { service, saved } = makeService();

    await service.create(input, 7);

    expect(saved[0]).toMatchObject({
      price: '114000.00',
      cost: '87500.00',
      markupFixed: '26500.00',
      markupPercent: '30.29',
      createdBy: 7,
    });
  });

  it('records the price without a rate when none has been entered yet', async () => {
    const { service, rates, saved } = makeService();
    rates.findEffective.mockRejectedValue(new NotFoundException());

    await service.create(input, 7);

    // The price still stands; it just cannot be read in the other currency.
    expect(saved[0].rate).toBeNull();
    expect(saved[0].price).toBe('114000.00');
  });

  it('files the price on the day the request names', async () => {
    const { service, saved } = makeService();

    await service.create({ ...input, date: '2026-01-09' }, 7);

    expect(saved[0].date).toBe('2026-01-09');
  });

  it('404s an unknown variant before touching the rate table', async () => {
    const { service, variants, rates } = makeService();
    variants.existsBy.mockResolvedValue(false);

    await expect(service.create(input, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(rates.findEffective).not.toHaveBeenCalled();
  });
});

describe('list', () => {
  it('reads with the tiebreaker, or a same-day correction is a coin flip', async () => {
    const { service, builder } = makeService();

    await service.list('2026-08-20');

    expect(builder.distinctOn).toHaveBeenCalledWith(['p.variantId']);
    expect(builder.orderBy).toHaveBeenCalledWith('p.variantId', 'ASC');
    expect(builder.addOrderBy).toHaveBeenNthCalledWith(1, 'p.date', 'DESC');
    expect(builder.addOrderBy).toHaveBeenNthCalledWith(2, 'p.id', 'DESC');
  });

  it('pairs every active variant with its price, null included', async () => {
    const { service, variants, builder } = makeService();
    variants.find.mockResolvedValue([{ id: 41 }, { id: 42 }]);
    builder.getMany.mockResolvedValue([{ variantId: 41, price: '114000.00' }]);

    await expect(service.list('2026-08-20')).resolves.toEqual([
      { variant: { id: 41 }, price: { variantId: 41, price: '114000.00' } },
      { variant: { id: 42 }, price: null },
    ]);
  });
});

describe('history', () => {
  it('404s an unknown variant', async () => {
    const { service, variants } = makeService();
    variants.existsBy.mockResolvedValue(false);

    await expect(service.history(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('orders newest decision first, tiebroken by id', async () => {
    const { service, repo } = makeService();

    await service.history(41);

    expect(repo.find).toHaveBeenCalledWith({
      where: { variantId: 41 },
      order: { date: 'DESC', id: 'DESC' },
    });
  });
});
