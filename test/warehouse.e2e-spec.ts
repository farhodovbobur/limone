import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

/**
 * The warehouse against a real PostgreSQL. Everything here is something a unit
 * test cannot prove: the negative-stock rule under concurrency, the derived
 * balances equalling the ledger, a count reconciled against the balance, and
 * the role matrix.
 *
 * Unlike the other suites this one leaves **RolesGuard real** — a 403 is
 * unprovable otherwise. Only JwtAuthGuard is stubbed, and it hands the request
 * a role the tests move around.
 *
 * Sentinels are `E2W`, and rates live in 2021, a year no other suite touches.
 */

const auth = { userId: 0, role: 'superadmin' };
const allowJwt = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    req.user = { sub: auth.userId, username: 'e2e-wh-bot', role: auth.role };
    return true;
  },
};

const RATE_DAY = '2021-03-01';
const OPEN_DAY = '2021-03-05';
const LATER_DAY = '2021-06-10';

type IdRow = { id: number };
type Movement = IdRow & {
  variantId: number;
  qty: number;
};
type Posted = {
  document: IdRow & { number: string; type: string };
  movements: Movement[];
  replayed: boolean;
};
type Stock = { variantId: number; qty: number };

describe('Warehouse (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;

  let qoraId: number;
  let oqId: number;
  let kokId: number;
  let sariqId: number;
  let productId: number;
  let sizeId: number;
  let issueDocId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowJwt)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
    // Listening once, explicitly — see the note in the other suites. Here it
    // also matters because the concurrency test fires five requests at once.
    await app.listen(0);
    http = app.getHttpServer();

    const users: { id: number }[] = await app.get(DataSource).query(
      `INSERT INTO users (username, first_name, password_hash, role_id, is_active)
         VALUES ('e2e-wh-bot', 'E2W', 'not-a-login',
                 (SELECT id FROM roles WHERE name = 'superadmin'), false)
         ON CONFLICT (username) DO UPDATE SET first_name = EXCLUDED.first_name
         RETURNING id`,
    );
    auth.userId = users[0].id;
    auth.role = 'superadmin';

    await clean();

    await post('/api/exchange-rates', { date: RATE_DAY, rate: 10000 });
    await post('/api/exchange-rates', { date: '2021-06-01', rate: 12500 });

    sizeId = await post<IdRow>('/api/sizes', {
      name: 'E2WS',
      sortOrder: 9701,
    }).then((r) => r.id);
    const qora = await post<IdRow>('/api/colors', { name: 'E2W Qora' }).then(
      (r) => r.id,
    );
    const oq = await post<IdRow>('/api/colors', { name: 'E2W Oq' }).then(
      (r) => r.id,
    );
    const kok = await post<IdRow>('/api/colors', { name: 'E2W Kok' }).then(
      (r) => r.id,
    );
    const sariq = await post<IdRow>('/api/colors', { name: 'E2W Sariq' }).then(
      (r) => r.id,
    );
    productId = await post<IdRow>('/api/products', {
      name: 'E2W Koylak',
      code: 'E2W1',
    }).then((r) => r.id);

    const created = await post<{ variants: IdRow[] }>('/api/product-variants', {
      productId,
      sizeIds: [sizeId],
      colors: [
        { colorId: qora },
        { colorId: oq },
        { colorId: kok },
        { colorId: sariq },
      ],
    });
    [qoraId, oqId, kokId, sariqId] = created.variants.map((v) => v.id);
  });

  afterAll(async () => {
    try {
      await clean();
      await app
        .get(DataSource)
        .query(`DELETE FROM users WHERE username = 'e2e-wh-bot'`);
    } finally {
      // Always: a throw above would otherwise leave the pool open and hang the
      // whole run instead of reporting the failure.
      await app.close();
    }
  });

  async function post<T>(path: string, body: unknown = {}): Promise<T> {
    const res = await request(http)
      .post(path)
      .send(body as object);
    if (res.status !== 201) {
      throw new Error(`${path} -> ${res.status}: ${JSON.stringify(res.body)}`);
    }
    return res.body as T;
  }

  /**
   * §6's guarantee, asked directly: the balance table is exactly `SUM(qty)` of
   * the ledger, and no row holds a quantity that could not be true. D14 removed
   * the CHECK constraints, so nothing in the database asks the second question.
   */
  async function drift(): Promise<unknown[]> {
    return app.get(DataSource).query(`
      SELECT COALESCE(m.variant_id, b.variant_id) AS "variantId",
             COALESCE(m.qty, 0) AS ledger, COALESCE(b.qty, 0) AS table_qty
        FROM (SELECT variant_id, SUM(qty)::int AS qty
                FROM warehouse_product_movements GROUP BY variant_id) m
        FULL JOIN warehouse_product_balances b ON b.variant_id = m.variant_id
       WHERE COALESCE(m.qty, 0) <> COALESCE(b.qty, 0)
          OR COALESCE(b.qty, 0) < 0
    `);
  }

  /** Throws the derived table away and rebuilds it from the ledger. */
  async function rebuild(): Promise<void> {
    const ds = app.get(DataSource);
    await ds.query('DELETE FROM warehouse_product_balances');
    await ds.query(`
      INSERT INTO warehouse_product_balances (variant_id, qty, updated_at)
      SELECT variant_id, SUM(qty)::int, now()
        FROM warehouse_product_movements GROUP BY variant_id
    `);
  }

  async function clean() {
    const ds = app.get(DataSource);
    const ours = `SELECT v.id FROM product_variants v
                    JOIN products p ON p.id = v.product_id
                   WHERE p.name LIKE 'E2W%'`;
    await ds.query(
      `DELETE FROM warehouse_product_movements WHERE variant_id IN (${ours})`,
    );
    // By author, not by number: a reversal is dated *today*, so it is numbered
    // REV-2026-… and a year-scoped delete would leave it holding the FK on the
    // bot user — which is exactly what broke the teardown the first time.
    await ds.query(
      `DELETE FROM warehouse_product_documents
        WHERE created_by IN (SELECT id FROM users WHERE username = 'e2e-wh-bot')`,
    );
    await ds.query(
      `DELETE FROM warehouse_product_balances WHERE variant_id IN (${ours})`,
    );
    await ds.query(`DELETE FROM document_counters WHERE scope LIKE '%-2021'`);
    // The dashboard test prices a variant, and a priced variant cannot be
    // deleted (RESTRICT) — that is the price list protecting its own history.
    await ds.query(`DELETE FROM product_prices WHERE variant_id IN (${ours})`);
    await ds.query(
      `DELETE FROM product_barcodes WHERE variant_id IN (${ours})`,
    );
    await ds.query(
      `DELETE FROM product_variants
        WHERE product_id IN (SELECT id FROM products WHERE name LIKE 'E2W%')`,
    );
    await ds.query(`DELETE FROM products WHERE name LIKE 'E2W%'`);
    await ds.query(`DELETE FROM sizes WHERE name = 'E2WS'`);
    await ds.query(`DELETE FROM colors WHERE name LIKE 'E2W %'`);
    await ds.query(
      `DELETE FROM exchange_rates WHERE date BETWEEN '2021-01-01' AND '2021-12-31'`,
    );
  }

  const stockOf = async (variantId: number): Promise<Stock> => {
    const res = await request(http)
      .get(`/api/warehouse-balances/${variantId}`)
      .expect(200);
    return res.body as Stock;
  };

  describe('opening balance', () => {
    it('numbers the document and writes lines that carry only pieces', async () => {
      const body = await post<Posted>('/api/warehouse-movements/opening', {
        date: OPEN_DAY,
        lines: [
          {
            variantId: qoraId,
            qty: 10,
          },
        ],
      });

      expect(body.document.number).toBe('OPN-2021-000001');
      // The line carries nothing but the pieces; everything else is on the
      // document it belongs to.
      expect(body.movements[0]).toMatchObject({ qty: 10 });
      // Pinned on purpose: anything added here is a fact that belongs on the
      // document, or a cost that belongs to the goods-receipt stage.
      expect(Object.keys(body.movements[0]).sort()).toEqual([
        'createdAt',
        'documentId',
        'id',
        'qty',
        'updatedAt',
        'variantId',
      ]);
    });

    it('404s a variant that does not exist', async () => {
      await request(http)
        .post('/api/warehouse-movements/opening')
        .send({
          date: LATER_DAY,
          lines: [
            {
              variantId: 999999,
              qty: 1,
            },
          ],
        })
        .expect(404);
    });

    it('replays a resubmitted form instead of writing it twice', async () => {
      const payload = {
        date: OPEN_DAY,
        clientRef: 'E2W-idem-1',
        lines: [
          {
            variantId: oqId,
            qty: 9,
          },
        ],
      };
      const first = await post<Posted>(
        '/api/warehouse-movements/opening',
        payload,
      );
      const second = await post<Posted>(
        '/api/warehouse-movements/opening',
        payload,
      );

      expect(second.document.id).toBe(first.document.id);
      expect(second.replayed).toBe(true);
      expect((await stockOf(oqId)).qty).toBe(9);
    });
  });

  describe('idempotency', () => {
    it('writes one document when the same submit arrives twice at once', async () => {
      const payload = {
        date: LATER_DAY,
        clientRef: 'E2W-race-1',
        lines: [
          {
            variantId: kokId,
            qty: 1,
          },
        ],
      };
      const both = await Promise.all([
        request(http).post('/api/warehouse-movements/opening').send(payload),
        request(http).post('/api/warehouse-movements/opening').send(payload),
      ]);

      expect(both.every((r) => r.status === 201)).toBe(true);
      const ids = both.map((r) => (r.body as Posted).document.id);
      expect(ids[0]).toBe(ids[1]);
      expect(both.some((r) => (r.body as Posted).replayed)).toBe(true);
    });

    it('refuses to reuse a reference for a different kind of document', async () => {
      await request(http)
        .post('/api/warehouse-movements/issue')
        .send({
          date: LATER_DAY,
          clientRef: 'E2W-race-1',
          lines: [{ variantId: kokId, qty: 1 }],
        })
        .expect(409);
    });

    it('refuses to reuse a reference for a different payload', async () => {
      // Same type, same reference, different quantity. Answering 201 with the
      // *old* document would tell the keeper their new shipment landed when it
      // never did — the one failure a replay must never impersonate.
      const before = (await stockOf(kokId)).qty;
      const res = await request(http)
        .post('/api/warehouse-movements/opening')
        .send({
          date: LATER_DAY,
          clientRef: 'E2W-race-1',
          lines: [{ variantId: kokId, qty: 77 }],
        })
        .expect(409);

      expect((res.body as { message: string }).message).toMatch(
        /not this document/,
      );
      expect((await stockOf(kokId)).qty).toBe(before);
    });

    it('carries a reference through a count without a 500', async () => {
      await post('/api/warehouse-movements/opening', {
        date: OPEN_DAY,
        lines: [{ variantId: sariqId, qty: 12 }],
      });

      const first = await request(http)
        .post('/api/warehouse-movements/count')
        .send({
          date: LATER_DAY,
          clientRef: 'E2W-count-ref',
          lines: [{ variantId: sariqId, countedQty: 10 }],
        })
        .expect(201);
      expect((first.body as Posted).movements[0]).toMatchObject({ qty: -2 });

      // Re-submitting the same form finds no drift left, so there is nothing to
      // write and the reference is never offered to the unique index twice.
      await request(http)
        .post('/api/warehouse-movements/count')
        .send({
          date: LATER_DAY,
          clientRef: 'E2W-count-ref',
          lines: [{ variantId: sariqId, countedQty: 10 }],
        })
        .expect(201)
        .expect((res) => expect(res.body).toEqual({}));

      // Stock moved since, so the same reference now describes a different
      // correction. That is a 409 — it used to be an unhandled 23505.
      await post('/api/warehouse-movements/issue', {
        date: LATER_DAY,
        lines: [{ variantId: sariqId, qty: 1 }],
      });
      await request(http)
        .post('/api/warehouse-movements/count')
        .send({
          date: LATER_DAY,
          clientRef: 'E2W-count-ref',
          lines: [{ variantId: sariqId, countedQty: 10 }],
        })
        .expect(409);
      expect((await stockOf(sariqId)).qty).toBe(9);
    });
  });

  describe('issue', () => {
    it('takes the pieces off the shelf', async () => {
      const before = await stockOf(qoraId);
      const body = await post<Posted>('/api/warehouse-movements/issue', {
        date: LATER_DAY,
        lines: [{ variantId: qoraId, qty: 5 }],
      });
      issueDocId = body.document.id;

      expect(body.movements[0]).toMatchObject({ qty: -5 });

      expect((await stockOf(qoraId)).qty).toBe(before.qty - 5);
    });

    it('refuses to go negative, naming what is short (D4)', async () => {
      const res = await request(http)
        .post('/api/warehouse-movements/issue')
        .send({ date: LATER_DAY, lines: [{ variantId: qoraId, qty: 999 }] })
        .expect(409);

      expect((res.body as { message: string }).message).toMatch(
        /Stock would go negative/,
      );
    });

    it('folds two lines for the same shelf before checking, not after', async () => {
      const before = (await stockOf(qoraId)).qty;
      // Each line fits on its own; together they do not. The guard must see
      // the document, not the line.
      await request(http)
        .post('/api/warehouse-movements/issue')
        .send({
          date: LATER_DAY,
          lines: [
            { variantId: qoraId, qty: before },
            { variantId: qoraId, qty: before },
          ],
        })
        .expect(409);

      expect((await stockOf(qoraId)).qty).toBe(before);
    });

    it('lets exactly as many concurrent issues through as there is stock', async () => {
      // Nine pieces, five simultaneous requests for three each.
      const attempts = Array.from({ length: 5 }, () =>
        request(http)
          .post('/api/warehouse-movements/issue')
          .send({ date: LATER_DAY, lines: [{ variantId: oqId, qty: 3 }] }),
      );
      const results = await Promise.all(attempts);
      const ok = results.filter((r) => r.status === 201).length;
      const refused = results.filter((r) => r.status === 409).length;

      expect(ok).toBe(3);
      expect(refused).toBe(2);
      expect((await stockOf(oqId)).qty).toBe(0);
    });
  });

  describe('reversal', () => {
    it('undoes a document by negating it exactly, never by editing it (D3)', async () => {
      const before = await stockOf(qoraId);
      const body = await post<Posted>('/api/warehouse-movements/reversal', {
        date: LATER_DAY,
        documentId: issueDocId,
      });

      expect(body.document.type).toBe('REVERSAL');
      expect(body.movements[0]).toMatchObject({ qty: 5 });

      const after = await stockOf(qoraId);
      expect(after.qty).toBe(before.qty + 5);
    });

    it('refuses to reverse the same document twice', async () => {
      await request(http)
        .post('/api/warehouse-movements/reversal')
        .send({ date: LATER_DAY, documentId: issueDocId })
        .expect(409);
    });

    it('refuses two simultaneous reversals — the index has the last word', async () => {
      const doc = await post<Posted>('/api/warehouse-movements/opening', {
        date: LATER_DAY,
        lines: [
          {
            variantId: kokId,
            qty: 2,
          },
        ],
      });

      const both = await Promise.all([
        request(http)
          .post('/api/warehouse-movements/reversal')
          .send({ date: LATER_DAY, documentId: doc.document.id }),
        request(http)
          .post('/api/warehouse-movements/reversal')
          .send({ date: LATER_DAY, documentId: doc.document.id }),
      ]);

      expect(both.filter((r) => r.status === 201)).toHaveLength(1);
      expect(both.filter((r) => r.status === 409)).toHaveLength(1);
      expect(await drift()).toEqual([]);
    });

    it('refuses to reverse a reversal', async () => {
      const list = await request(http)
        .get('/api/warehouse-movements?limit=200')
        .expect(200);
      const reversal = (
        list.body as {
          rows: (Movement & { document: { id: number; type: string } })[];
        }
      ).rows.find((r) => r.document.type === 'REVERSAL');

      await request(http)
        .post('/api/warehouse-movements/reversal')
        .send({ date: LATER_DAY, documentId: reversal!.document.id })
        .expect(409);
    });

    it('refuses a reversal that would drive stock negative', async () => {
      const doc = await post<Posted>('/api/warehouse-movements/opening', {
        date: LATER_DAY,
        lines: [
          {
            variantId: kokId,
            qty: 3,
          },
        ],
      });
      await post<Posted>('/api/warehouse-movements/issue', {
        date: LATER_DAY,
        lines: [{ variantId: kokId, qty: 3 }],
      });

      // Undoing the receipt now would take the shelf below zero, so the
      // issue has to be undone first.
      await request(http)
        .post('/api/warehouse-movements/reversal')
        .send({ date: LATER_DAY, documentId: doc.document.id })
        .send({})
        .expect(409);
    });
  });

  describe('count', () => {
    it('writes only the differences, and measures them against the balance now', async () => {
      const before = (await stockOf(qoraId)).qty;

      const res = await request(http)
        .post('/api/warehouse-movements/count')
        .send({
          date: LATER_DAY,
          lines: [
            { variantId: qoraId, countedQty: before - 1 },
            // This one agrees; it must not produce a movement.
            { variantId: kokId, countedQty: (await stockOf(kokId)).qty },
          ],
        })
        .expect(201);

      const posted = res.body as Posted;
      expect(posted.movements).toHaveLength(1);
      expect(posted.movements[0]).toMatchObject({
        variantId: qoraId,
        qty: -1,
      });
      expect(posted.document.type).toBe('ADJUSTMENT');
      expect((await stockOf(qoraId)).qty).toBe(before - 1);
    });

    it('says nothing happened when the shelf agrees with the ledger', async () => {
      const res = await request(http)
        .post('/api/warehouse-movements/count')
        .send({
          date: LATER_DAY,
          lines: [
            { variantId: qoraId, countedQty: (await stockOf(qoraId)).qty },
          ],
        })
        .expect(201);

      expect(res.body).toEqual({});
    });

    it('counts a surplus as easily as a shortage', async () => {
      const before = (await stockOf(kokId)).qty;

      const res = await request(http)
        .post('/api/warehouse-movements/count')
        .send({
          date: LATER_DAY,
          lines: [{ variantId: kokId, countedQty: before + 3 }],
        })
        .expect(201);

      expect((res.body as Posted).movements[0]).toMatchObject({ qty: 3 });
      expect((await stockOf(kokId)).qty).toBe(before + 3);
    });

    it('refuses a negative count and an unknown variant', async () => {
      await request(http)
        .post('/api/warehouse-movements/count')
        .send({
          date: LATER_DAY,
          lines: [{ variantId: qoraId, countedQty: -1 }],
        })
        .expect(400);
      await request(http)
        .post('/api/warehouse-movements/count')
        .send({
          date: LATER_DAY,
          lines: [{ variantId: 999999, countedQty: 1 }],
        })
        .expect(404);
    });
  });

  describe('the ledger is the fact', () => {
    it('filters by variant, and refuses nonsense with 400 not 500', async () => {
      const mine = await request(http)
        .get(`/api/warehouse-movements?variantId=${kokId}`)
        .expect(200);

      const rows = (mine.body as { rows: Movement[] }).rows;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.variantId === kokId)).toBe(true);

      await request(http)
        .get('/api/warehouse-movements?limit=9999')
        .expect(400);
      // `.strict()`: an unknown filter is a typo, not a silent no-op.
      await request(http)
        .get('/api/warehouse-movements?type=OPENING')
        .expect(400);
    });

    it('exposes no way to edit or delete a movement (D3)', async () => {
      await request(http)
        .patch('/api/warehouse-movements/1')
        .send({ qty: 1 })
        .expect(404);
      await request(http).delete('/api/warehouse-movements/1').expect(404);
    });

    it('equals a from-scratch aggregate of itself (AC 14)', async () => {
      expect(await drift()).toEqual([]);
    });

    it('still equals it after the derived tables are thrown away and rebuilt', async () => {
      const before = await stockOf(qoraId);
      await rebuild();
      const after = await stockOf(qoraId);

      expect(after.qty).toBe(before.qty);
      expect(await drift()).toEqual([]);
    });
  });

  describe('what the warehouse refuses', () => {
    it('refuses to receive stock onto a discontinued variant', async () => {
      const ds = app.get(DataSource);
      // Something on the shelf first, so the second half of this test has
      // stock to take off it.
      await post<Posted>('/api/warehouse-movements/opening', {
        date: LATER_DAY,
        lines: [{ variantId: sariqId, qty: 3 }],
      });
      await ds.query(
        'UPDATE product_variants SET is_active = false WHERE id = $1',
        [sariqId],
      );
      try {
        await request(http)
          .post('/api/warehouse-movements/opening')
          .send({
            date: LATER_DAY,
            lines: [
              {
                variantId: sariqId,
                qty: 1,
              },
            ],
          })
          .expect(409);

        // Emptying it must still work, or stock is trapped on the shelf.
        await post<Posted>('/api/warehouse-movements/issue', {
          date: LATER_DAY,
          lines: [{ variantId: sariqId, qty: 1 }],
        });
      } finally {
        await ds.query(
          'UPDATE product_variants SET is_active = true WHERE id = $1',
          [sariqId],
        );
      }
    });

    it('reports an impossible number even when the ledger agrees with it', async () => {
      const ds = app.get(DataSource);
      await ds.query(
        `INSERT INTO warehouse_product_balances (variant_id, qty, updated_at)
           VALUES ($1, -4, now())
         ON CONFLICT (variant_id) DO UPDATE SET qty = -4`,
        [sariqId],
      );
      try {
        // It disagrees with the ledger *and* it is a quantity that cannot be
        // true — the drift query is asked both questions.
        expect(await drift()).toHaveLength(1);
      } finally {
        await ds.query(
          `DELETE FROM warehouse_product_balances WHERE variant_id = $1`,
          [sariqId],
        );
      }
    });
  });

  describe('role matrix (AC 15)', () => {
    afterEach(() => {
      auth.role = 'superadmin';
    });

    it('lets the workshop manager look but not touch', async () => {
      auth.role = 'workshop_manager';

      await request(http).get(`/api/warehouse-balances/${qoraId}`).expect(200);
      await request(http)
        .post('/api/warehouse-movements/issue')
        .send({ date: LATER_DAY, lines: [{ variantId: qoraId, qty: 1 }] })
        .expect(403);
    });

    it('lets the warehouse keeper do both', async () => {
      auth.role = 'warehouse_keeper';

      await request(http).get('/api/warehouse-balances').expect(200);
      await post<Posted>('/api/warehouse-movements/issue', {
        date: LATER_DAY,
        lines: [{ variantId: qoraId, qty: 1 }],
      });
    });

    it('lets the director read the numbers without moving stock', async () => {
      auth.role = 'director';

      await request(http).get('/api/warehouse-balances').expect(200);
      await request(http)
        .post('/api/warehouse-movements/issue')
        .send({ date: LATER_DAY, lines: [{ variantId: qoraId, qty: 1 }] })
        .expect(403);
    });

    it.each([['worker'], ['sales'], ['customer']])(
      'shuts %s out entirely',
      async (role) => {
        auth.role = role;

        await request(http).get('/api/warehouse-balances').expect(403);
        await request(http)
          .post('/api/warehouse-movements/count')
          .send({
            date: LATER_DAY,
            lines: [{ variantId: qoraId, countedQty: 1 }],
          })
          .expect(403);
      },
    );
  });

  describe('balances', () => {
    it('lists what is left, with the garment it belongs to', async () => {
      const res = await request(http)
        .get('/api/warehouse-balances')
        .expect(200);

      const body = res.body as {
        rows: {
          variantId: number;
          qty: number;
          variant: { sku: string; product: { name: string } };
        }[];
        total: number;
      };
      expect(body.total).toBeGreaterThan(0);

      const mine = body.rows.find((r) => r.variantId === qoraId);
      expect(mine?.qty).toBe((await stockOf(qoraId)).qty);
      // Readable without a second request per row.
      expect(mine?.variant.product.name).toBe('E2W Koylak');
      expect(mine?.variant.sku).toContain('E2W');
    });

    it('narrows to one product, and refuses an unknown filter', async () => {
      const res = await request(http)
        .get(`/api/warehouse-balances?variantId=${qoraId}`)
        .expect(200);

      expect((res.body as { rows: { variantId: number }[] }).rows).toHaveLength(
        1,
      );
      await request(http).get('/api/warehouse-balances?colour=red').expect(400);
    });

    it('stamps the balance row every time stock moves', async () => {
      const ds = app.get(DataSource);
      const stamp = async (): Promise<Date> => {
        const rows = await ds.query<{ updated_at: Date }[]>(
          'SELECT updated_at FROM warehouse_product_balances WHERE variant_id = $1',
          [qoraId],
        );
        return rows[0].updated_at;
      };

      const before = await stamp();
      await post('/api/warehouse-movements/issue', {
        date: LATER_DAY,
        lines: [{ variantId: qoraId, qty: 1 }],
      });

      // upsert builds its DO UPDATE SET list from the keys it is handed, so an
      // @UpdateDateColumn left off them stays frozen at the insert forever.
      expect((await stamp()).getTime()).toBeGreaterThan(before.getTime());
    });

    it('answers zero for a variant that never held stock', async () => {
      const colorId = await post<IdRow>('/api/colors', {
        name: 'E2W Yashil',
      }).then((r) => r.id);
      const fresh = await post<{ variants: IdRow[] }>('/api/product-variants', {
        productId,
        sizeIds: [sizeId],
        colors: [{ colorId }],
      });
      const id = fresh.variants[0].id;

      // No balance row exists for it at all — zero is still the answer.
      const res = await request(http)
        .get(`/api/warehouse-balances/${id}`)
        .expect(200);
      expect(res.body).toEqual({ variantId: id, qty: 0 });
    });
  });

  describe('pool pressure', () => {
    it('survives more simultaneous receipts than the pool has connections', async () => {
      // A receipt needs the day's exchange rate. Looking that up *inside* the
      // transaction takes a second pool connection while holding the first, and
      // enough concurrent receipts then wait forever for a connection that
      // nobody will release. This test hangs if that ever comes back.
      const eight = Array.from({ length: 8 }, (_, i) =>
        request(http)
          .post('/api/warehouse-movements/opening')
          .send({
            date: LATER_DAY,
            lines: [
              {
                variantId: [qoraId, oqId, kokId][i % 3],
                qty: 1,
              },
            ],
          }),
      );

      const results = await Promise.all(eight);
      expect(results.every((r) => r.status === 201)).toBe(true);
    });
  });
});
