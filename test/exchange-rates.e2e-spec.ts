import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/shared/guards/roles.guard';

/**
 * The layer the unit tests cannot reach: routing, the Zod pipe, and TypeORM's
 * mapping of `numeric` and `date` against a real PostgreSQL.
 *
 * Auth is stubbed out — the guards have their own specs, and this file is about
 * what happens *after* a request is let through. Rows land on sentinel dates in
 * 2099 so they can never collide with real data, and are deleted afterwards.
 */

const DATE = '2099-12-30';
const LATER = '2099-12-31';
const allow = { canActivate: () => true };

type RateBody = { id: number; date: string; rate: string; source: string };
type ErrorBody = { message: string };

/** supertest types `body` as `any`; naming the shape keeps the lint honest. */
const rate = (res: request.Response) => res.body as RateBody;
const rates = (res: request.Response) => res.body as RateBody[];

describe('ExchangeRates (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;

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
    // Mirrors main.ts — without the pipe, every validation assertion below
    // would pass for the wrong reason.
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
    // Listening once, explicitly. Left to itself supertest opens and closes an
    // ephemeral server per request, and across a few hundred requests one of
    // them lands on a socket that is already closing — which surfaces as
    // "Parse Error: Expected HTTP/" on an unrelated test.
    await app.listen(0);
    http = app.getHttpServer();

    await clean();
  });

  afterAll(async () => {
    await clean();
    await app.close();
  });

  async function clean() {
    await app
      .get(DataSource)
      .query(`DELETE FROM exchange_rates WHERE date >= '2099-01-01'`);
  }

  describe('POST /api/exchange-rates', () => {
    it('creates a rate and stamps it MANUAL', async () => {
      const res = await request(http)
        .post('/api/exchange-rates')
        .send({ date: DATE, rate: 12650 })
        .expect(201);

      expect(rate(res)).toMatchObject({ date: DATE, source: 'MANUAL' });
      // numeric comes back as a string via node-postgres — asserted so a future
      // transformer cannot change the contract unnoticed.
      expect(rate(res).rate).toBe('12650');
    });

    it('refuses a second rate for the same day', async () => {
      await request(http)
        .post('/api/exchange-rates')
        .send({ date: DATE, rate: 12700 })
        .expect(409);
    });

    it('answers 409, never 500, when several writers pick the same day at once', async () => {
      // `existsBy` then `save` is not atomic: the CBU job and a person entering
      // the morning rate can both pass the check. The loser must meet the same
      // 409 the sequential path gives, not an unhandled 23505.
      const all = await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          request(http)
            .post('/api/exchange-rates')
            .send({ date: '2099-06-01', rate: 12800 + i }),
        ),
      );

      const statuses = all.map((r) => r.status);
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    });

    it('refuses a client-declared source', async () => {
      await request(http)
        .post('/api/exchange-rates')
        .send({ date: LATER, rate: 12650, source: 'CBU' })
        .expect(400);
    });

    it.each([
      ['a negative rate', { date: LATER, rate: -5 }],
      ['an unknown field', { date: LATER, rate: 12650, note: 'x' }],
      [
        'a timestamp instead of a date',
        { date: `${LATER}T00:00:00Z`, rate: 1 },
      ],
    ])('refuses %s', async (_label, body) => {
      await request(http).post('/api/exchange-rates').send(body).expect(400);
    });
  });

  describe('GET /api/exchange-rates/effective', () => {
    it('returns the exact day when one exists', async () => {
      const res = await request(http)
        .get(`/api/exchange-rates/effective?date=${DATE}`)
        .expect(200);

      expect(rate(res).date).toBe(DATE);
    });

    it('falls back to the previous rate on a day with none', async () => {
      const res = await request(http)
        .get(`/api/exchange-rates/effective?date=${LATER}`)
        .expect(200);

      expect(rate(res).date).toBe(DATE);
    });

    it('404s before the first rate, naming the date asked for', async () => {
      const res = await request(http)
        .get('/api/exchange-rates/effective?date=1900-01-01')
        .expect(404);

      expect((res.body as ErrorBody).message).toContain('1900-01-01');
    });

    it('is routed above :id — "effective" is not read as an id', async () => {
      // Declaration order in the controller is what makes this pass; a 400
      // here would mean ParseIntPipe got the word instead.
      await request(http)
        .get(`/api/exchange-rates/effective?date=${DATE}`)
        .expect(200);
    });
  });

  describe('PATCH /api/exchange-rates/:id', () => {
    it('updates the rate', async () => {
      const list = await request(http).get('/api/exchange-rates').expect(200);
      const id = rates(list).find((r) => r.date === DATE)!.id;

      const res = await request(http)
        .patch(`/api/exchange-rates/${id}`)
        .send({ rate: 12800 })
        .expect(200);

      expect(rate(res).rate).toBe('12800.00');
    });

    it('refuses to move a rate to another date', async () => {
      const list = await request(http).get('/api/exchange-rates').expect(200);
      const id = rates(list).find((r) => r.date === DATE)!.id;

      await request(http)
        .patch(`/api/exchange-rates/${id}`)
        .send({ date: LATER })
        .expect(400);
    });

    it('404s for an id that does not exist', async () => {
      await request(http)
        .patch('/api/exchange-rates/999999')
        .send({ rate: 1 })
        .expect(404);
    });
  });
});
