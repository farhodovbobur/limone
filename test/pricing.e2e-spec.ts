import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/shared/guards/roles.guard';

/**
 * The price list against a real PostgreSQL: the frozen rate, the computed
 * markup caches, and the three date rules that no unit test can prove —
 * same-day corrections decided by `id DESC`, as-of reads, and future-dated
 * rows staying invisible until their day arrives.
 *
 * Sentinels are `E2P`-prefixed and rates live in 2020, a year no other suite
 * touches; both hooks clean by those markers, so suites may run in parallel
 * and a crashed run cannot poison the next one.
 */

const auth = { userId: 0 };
const allow = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    req.user = { sub: auth.userId };
    return true;
  },
};

const RATE_DAY = '2020-03-01';
const PRICE_DAY = '2020-03-05';
const SECOND_RATE_DAY = '2020-06-01';
const LATER_DAY = '2020-06-10';
const FUTURE_DAY = '2020-12-01';

type IdRow = { id: number };
type PriceBody = IdRow & {
  variantId: number;
  date: string;
  currency: string;
  price: string;
  rate: string | null;
  cost: string;
  markupFixed: string | null;
  markupPercent: string | null;
  createdAt: string;
  updatedAt: string;
};
type ListRow = { variant: IdRow; price: PriceBody | null };

describe('Pricing (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;

  let productId: number;
  let priced: number;
  let unpriced: number;
  let rateless: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allow)
      .overrideGuard(RolesGuard)
      .useValue(allow)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
    // Listening once, explicitly. Left to itself supertest opens and closes an
    // ephemeral server per request, and across a few hundred requests one of
    // them lands on a socket that is already closing — which surfaces as
    // "Parse Error: Expected HTTP/" on an unrelated test.
    await app.listen(0);
    http = app.getHttpServer();

    const users: { id: number }[] = await app.get(DataSource).query(
      `INSERT INTO users (username, first_name, password_hash, role_id, is_active)
         VALUES ('e2e-price-bot', 'E2P', 'not-a-login',
                 (SELECT id FROM roles WHERE name = 'superadmin'), false)
         ON CONFLICT (username) DO UPDATE SET first_name = EXCLUDED.first_name
         RETURNING id`,
    );
    auth.userId = users[0].id;

    await clean();

    // Two rates in 2020: a price must copy the one in force on its own date.
    await post('/api/exchange-rates', { date: RATE_DAY, rate: 9500 });
    await post('/api/exchange-rates', { date: SECOND_RATE_DAY, rate: 10000 });

    const sizeId = await post<IdRow>('/api/sizes', {
      name: 'E2PS',
      sortOrder: 9801,
    }).then((r) => r.id);
    const qora = await post<IdRow>('/api/colors', { name: 'E2P Qora' }).then(
      (r) => r.id,
    );
    const oq = await post<IdRow>('/api/colors', { name: 'E2P Oq' }).then(
      (r) => r.id,
    );
    const kok = await post<IdRow>('/api/colors', { name: 'E2P Kok' }).then(
      (r) => r.id,
    );
    productId = await post<IdRow>('/api/products', {
      name: 'E2P Koylak',
      code: 'E2P1',
    }).then((r) => r.id);

    const created = await post<{ variants: IdRow[] }>('/api/product-variants', {
      productId,
      sizeIds: [sizeId],
      colors: [{ colorId: qora }, { colorId: oq }, { colorId: kok }],
    });
    [priced, unpriced, rateless] = created.variants.map((v) => v.id);
  });

  afterAll(async () => {
    await clean();
    await app
      .get(DataSource)
      .query(`DELETE FROM users WHERE username = 'e2e-price-bot'`);
    await app.close();
  });

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await request(http)
      .post(path)
      .send(body as object);
    if (res.status !== 201) {
      throw new Error(`${path} -> ${res.status}: ${JSON.stringify(res.body)}`);
    }
    return res.body as T;
  }

  async function clean() {
    const ds = app.get(DataSource);
    const ours = `SELECT v.id FROM product_variants v
                    JOIN products p ON p.id = v.product_id
                   WHERE p.name LIKE 'E2P%'`;
    await ds.query(`DELETE FROM product_prices WHERE variant_id IN (${ours})`);
    await ds.query(
      `DELETE FROM product_barcodes WHERE variant_id IN (${ours})`,
    );
    await ds.query(
      `DELETE FROM product_variants
        WHERE product_id IN (SELECT id FROM products WHERE name LIKE 'E2P%')`,
    );
    await ds.query(`DELETE FROM products WHERE name LIKE 'E2P%'`);
    await ds.query(`DELETE FROM sizes WHERE name = 'E2PS'`);
    await ds.query(`DELETE FROM colors WHERE name LIKE 'E2P %'`);
    await ds.query(
      `DELETE FROM exchange_rates WHERE date BETWEEN '2020-01-01' AND '2020-12-31'`,
    );
  }

  const listOn = async (date: string): Promise<ListRow[]> => {
    const res = await request(http)
      .get(`/api/product-prices?productId=${productId}&date=${date}`)
      .expect(200);
    return res.body as ListRow[];
  };

  const priceOf = (rows: ListRow[], variantId: number) =>
    rows.find((r) => r.variant.id === variantId)?.price ?? null;

  describe('writing a price', () => {
    it('freezes the rate in force on its own date and computes both caches', async () => {
      const body = await post<PriceBody>('/api/product-prices', {
        variantId: priced,
        currency: 'UZS',
        price: 114000,
        cost: 87500,
        date: PRICE_DAY,
        note: 'E2P first price',
      });

      expect(body).toMatchObject({
        price: '114000.00',
        rate: '9500.00', // the March rate, not the June one
        cost: '87500.00',
        markupFixed: '26500.00',
        markupPercent: '30.29',
      });
      // Nothing has been recomputed yet, so the two stamps still agree — that
      // is the whole meaning of `updated_at` on an append-only row.
      expect(body.updatedAt).toBe(body.createdAt);
    });

    it('copies a different rate for a decision made on a later date', async () => {
      const body = await post<PriceBody>('/api/product-prices', {
        variantId: priced,
        currency: 'UZS',
        price: 130000,
        cost: 65000,
        date: LATER_DAY,
      });

      expect(body.rate).toBe('10000.00');
      // 130 000 over a cost of 65 000 — the caches describe the decision.
      expect(body.markupFixed).toBe('65000.00');
      expect(body.markupPercent).toBe('100.00');
    });

    it('records a price on a date with no rate, leaving the rate null', async () => {
      await request(http)
        .post('/api/product-prices')
        .send({
          variantId: rateless,
          currency: 'UZS',
          price: 1000,
          cost: 500,
          date: '1999-01-01',
        })
        .expect(201)
        .expect(({ body }) => {
          // The price still stands; it just cannot be read in dollars.
          expect((body as PriceBody).rate).toBeNull();
        });
    });

    it('rounds a half-tiyin up instead of into the floor of binary arithmetic', async () => {
      // 8750.005 × 100 is 875000.4999999999 as a double, so the obvious
      // Math.round books this price a tiyin light — every time, silently.
      const body = await post<PriceBody>('/api/product-prices', {
        variantId: rateless,
        currency: 'UZS',
        price: 8750.005,
        cost: 8750,
        date: '1999-03-01',
      });

      expect(body.price).toBe('8750.01');
      expect(body.markupFixed).toBe('0.01');
    });

    it('records a markup too wide for a fixed-width column', async () => {
      // 1 000 000 over a cost of 1 is 99 999 900 %, and the DTO accepts that
      // pair. A derived cache may not be the thing that decides what is legal.
      const body = await post<PriceBody>('/api/product-prices', {
        variantId: rateless,
        currency: 'UZS',
        price: 1_000_000,
        cost: 1,
        date: '1999-04-01',
      });

      expect(body.markupPercent).toBe('99999900.00');
    });

    it('404s an unknown variant', async () => {
      await request(http)
        .post('/api/product-prices')
        .send({
          variantId: 999999,
          currency: 'UZS',
          price: 1000,
          cost: 500,
          date: PRICE_DAY,
        })
        .expect(404);
    });

    it.each([
      ['a markup cache the client tried to set', { markupPercent: 30 }],
      ['a rate the client tried to pick', { rate: 1 }],
      ['a zero price', { price: 0 }],
      ['a missing cost', { cost: undefined }],
    ])('rejects %s with 400', async (_label, patch) => {
      await request(http)
        .post('/api/product-prices')
        .send({
          variantId: priced,
          currency: 'UZS',
          price: 1000,
          cost: 500,
          date: PRICE_DAY,
          ...patch,
        })
        .expect(400);
    });
  });

  describe('reading the list', () => {
    it('lets a same-day correction win — the id tiebreaker, not luck', async () => {
      await post('/api/product-prices', {
        variantId: priced,
        currency: 'UZS',
        price: 118000,
        cost: 59000,
        date: PRICE_DAY,
        note: 'E2P same-day fix',
      });

      expect(priceOf(await listOn(PRICE_DAY), priced)?.price).toBe('118000.00');
    });

    it('answers a past date with the price that was in force then', async () => {
      expect(priceOf(await listOn('2020-04-01'), priced)?.price).toBe(
        '118000.00',
      );
      expect(priceOf(await listOn(LATER_DAY), priced)?.price).toBe('130000.00');
    });

    it('shows nothing before the first price was set', async () => {
      expect(priceOf(await listOn('2020-03-04'), priced)).toBeNull();
    });

    it('keeps a future-dated price invisible until its day arrives', async () => {
      await post('/api/product-prices', {
        variantId: priced,
        currency: 'UZS',
        price: 999000,
        cost: 499500,
        date: FUTURE_DAY,
      });

      expect(priceOf(await listOn(LATER_DAY), priced)?.price).toBe('130000.00');
      expect(priceOf(await listOn(FUTURE_DAY), priced)?.price).toBe(
        '999000.00',
      );
    });

    it('lists a variant that has no price at all, carrying null', async () => {
      const rows = await listOn(LATER_DAY);

      expect(rows.map((r) => r.variant.id).sort()).toEqual(
        [priced, unpriced, rateless].sort(),
      );
      expect(priceOf(rows, unpriced)).toBeNull();
    });

    it('drops the garments of a product that was discontinued', async () => {
      await request(http)
        .patch(`/api/products/${productId}`)
        .send({ isActive: false })
        .expect(200);

      expect(await listOn(LATER_DAY)).toEqual([]);

      await request(http)
        .patch(`/api/products/${productId}`)
        .send({ isActive: true })
        .expect(200);
    });

    it('rejects a malformed date with 400, not a 500', async () => {
      await request(http).get('/api/product-prices?date=yesterday').expect(400);
      await request(http).get('/api/product-prices').expect(400);
    });

    it('rejects a mistyped filter instead of quietly listing everything', async () => {
      await request(http)
        .get(`/api/product-prices?date=${PRICE_DAY}&prodctId=${productId}`)
        .expect(400);
    });
  });

  describe('history', () => {
    it('returns every decision, newest first, same-day tiebroken by id', async () => {
      const res = await request(http)
        .get(`/api/product-prices/variant/${priced}`)
        .expect(200);

      const rows = res.body as PriceBody[];
      expect(rows.map((r) => r.price)).toEqual([
        '999000.00', // FUTURE_DAY
        '130000.00', // LATER_DAY
        '118000.00', // PRICE_DAY, written second
        '114000.00', // PRICE_DAY, written first
      ]);
    });
  });

  describe('append-only', () => {
    it.each([['patch'], ['delete']] as const)(
      'exposes no %s route — a price is superseded, never edited (D13)',
      async (method) => {
        const res = await request(http)
          .get(`/api/product-prices/variant/${priced}`)
          .expect(200);
        const id = (res.body as PriceBody[])[0].id;

        await request(http)
          [method](`/api/product-prices/${id}`)
          .send({ price: 1 })
          .expect(404);
      },
    );
  });
});
