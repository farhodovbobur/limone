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
 * Products and variants against a real PostgreSQL: SKU generation, the two
 * partial unique indexes, matrix idempotency, and the colour filter that must
 * see both slots. Guards have their own specs and are stubbed out.
 *
 * Every row this file creates carries an E2E-prefixed name, and both hooks
 * delete by that prefix — so a crashed run cannot poison the next one.
 */

const allow = { canActivate: () => true };

type IdRow = { id: number };
type ProductBody = IdRow & {
  name: string;
  translations: Record<string, string>;
  categoryId: number | null;
  updatedAt: string;
};
type VariantBody = IdRow & {
  sku: string;
  colorId: number;
  color2Id: number | null;
  updatedAt: string;
};
type MatrixBody = { created: number; skipped: number };

describe('Catalog (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;

  let categoryId: number;
  let sizeS: number;
  let sizeM: number;
  let qora: number;
  let oq: number;
  let kok: number;
  let productId: number;

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
    http = app.getHttpServer();

    await clean();

    // Reference rows this file owns, created through the real API.
    categoryId = await post<IdRow>('/api/product-categories', {
      name: 'E2E Category',
    }).then((r) => r.id);
    sizeS = await post<IdRow>('/api/sizes', {
      name: 'E2S',
      sortOrder: 9901,
    }).then((r) => r.id);
    sizeM = await post<IdRow>('/api/sizes', {
      name: 'E2M',
      sortOrder: 9902,
    }).then((r) => r.id);
    qora = await post<IdRow>('/api/colors', {
      name: 'E2E Qora',
      hex: '#111111',
    }).then((r) => r.id);
    oq = await post<IdRow>('/api/colors', {
      name: 'E2E Oq',
      hex: '#EEEEEE',
    }).then((r) => r.id);
    kok = await post<IdRow>('/api/colors', {
      name: 'E2E Kok',
      hex: '#2244EE',
    }).then((r) => r.id);
  });

  afterAll(async () => {
    await clean();
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
    await ds.query(
      `DELETE FROM product_variants
        WHERE product_id IN (SELECT id FROM products WHERE name LIKE 'E2E%')`,
    );
    await ds.query(`DELETE FROM products WHERE name LIKE 'E2E%'`);
    await ds.query(`DELETE FROM sizes WHERE name IN ('E2S', 'E2M')`);
    await ds.query(`DELETE FROM colors WHERE name LIKE 'E2E %'`);
    await ds.query(`DELETE FROM product_categories WHERE name LIKE 'E2E %'`);
  }

  describe('products', () => {
    it('creates one and defaults translations.uz to the name', async () => {
      const res = await request(http)
        .post('/api/products')
        .send({ name: 'E2E Koylak', code: 'E2E01', categoryId })
        .expect(201);

      const body = res.body as ProductBody;
      productId = body.id;
      expect(body.translations.uz).toBe('E2E Koylak');
    });

    it('rejects a Cyrillic name — the RU-layout slip, caught at the door', async () => {
      await request(http)
        .post('/api/products')
        .send({ name: 'Йщкф Koylak' })
        .expect(400);
    });

    it('rejects a duplicate name with 409', async () => {
      await request(http)
        .post('/api/products')
        .send({ name: 'E2E Koylak' })
        .expect(409);
    });

    it('rejects a duplicate code with 409, not 500', async () => {
      await request(http)
        .post('/api/products')
        .send({ name: 'E2E Shim', code: 'E2E01' })
        .expect(409);
    });

    it('404s a nonexistent category instead of leaking the FK error', async () => {
      await request(http)
        .post('/api/products')
        .send({ name: 'E2E Kurtka', categoryId: 999999 })
        .expect(404);
    });

    it('answers an empty PATCH as a true no-op — updated_at untouched', async () => {
      const before = await request(http)
        .get(`/api/products/${productId}`)
        .expect(200);

      const res = await request(http)
        .patch(`/api/products/${productId}`)
        .send({})
        .expect(200);

      const body = res.body as ProductBody;
      expect(body.name).toBe('E2E Koylak');
      // Without the guard, TypeORM still runs UPDATE ... SET updated_at=now()
      // (the update-date column is added before the empty-values check), so a
      // 200 alone cannot tell the two implementations apart.
      expect(body.updatedAt).toBe((before.body as ProductBody).updatedAt);
    });

    it('filters by category', async () => {
      const res = await request(http)
        .get(`/api/products?categoryId=${categoryId}`)
        .expect(200);

      const names = (res.body as ProductBody[]).map((p) => p.name);
      expect(names).toContain('E2E Koylak');
    });
  });

  describe('variants', () => {
    it('generates the SKU from code + size + colour', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({ productId, sizeId: sizeS, colorId: qora })
        .expect(201);

      expect((res.body as VariantBody).sku).toBe('E2E01-E2S-E2EQORA');
    });

    it('rejects the same solid combination again — NULLS NOT DISTINCT via partial index', async () => {
      await request(http)
        .post('/api/product-variants')
        .send({ productId, sizeId: sizeS, colorId: qora })
        .expect(409);
    });

    it('appends the second colour to the SKU', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({ productId, sizeId: sizeS, colorId: qora, color2Id: oq })
        .expect(201);

      expect((res.body as VariantBody).sku).toBe('E2E01-E2S-E2EQORA-E2EOQ');
    });

    it('treats the reversed pair as a different garment (D17)', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({ productId, sizeId: sizeS, colorId: oq, color2Id: qora })
        .expect(201);

      expect((res.body as VariantBody).sku).toBe('E2E01-E2S-E2EOQ-E2EQORA');
    });

    it('rejects two identical colours with 400', async () => {
      await request(http)
        .post('/api/product-variants')
        .send({ productId, sizeId: sizeM, colorId: qora, color2Id: qora })
        .expect(400);
    });

    it('names the missing reference in a 404', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({ productId, sizeId: 999999, colorId: qora })
        .expect(404);

      expect((res.body as { message: string }).message).toContain('999999');
    });

    it('matrix creates the missing combinations and skips the existing one', async () => {
      // (S, qora) already exists as a solid; the other three are new.
      const res = await request(http)
        .post('/api/product-variants/matrix')
        .send({
          productId,
          sizeIds: [sizeS, sizeM],
          colors: [{ colorId: qora }, { colorId: oq }],
        })
        .expect(201);

      expect(res.body as MatrixBody).toMatchObject({ created: 3, skipped: 1 });
    });

    it('matrix re-run is a clean no-op', async () => {
      const res = await request(http)
        .post('/api/product-variants/matrix')
        .send({
          productId,
          sizeIds: [sizeS, sizeM],
          colors: [{ colorId: qora }, { colorId: oq }],
        })
        .expect(201);

      expect(res.body as MatrixBody).toMatchObject({ created: 0, skipped: 4 });
    });

    it('duplicates inside one payload are skipped, not a 500', async () => {
      const res = await request(http)
        .post('/api/product-variants/matrix')
        .send({
          productId,
          sizeIds: [sizeM, sizeM],
          colors: [{ colorId: kok }],
        })
        .expect(201);

      expect(res.body as MatrixBody).toMatchObject({ created: 1, skipped: 1 });
    });

    it('colour filter matches BOTH slots — solid and two-tone garments', async () => {
      const res = await request(http)
        .get(`/api/product-variants?colorId=${qora}`)
        .expect(200);

      const rows = res.body as VariantBody[];
      const skus = rows.map((v) => v.sku);
      // qora as the first colour, solid:
      expect(skus).toContain('E2E01-E2S-E2EQORA');
      // qora as the SECOND colour — the case a naive filter silently drops:
      expect(skus).toContain('E2E01-E2S-E2EOQ-E2EQORA');
      // and nothing without qora in either slot sneaks in:
      for (const v of rows) {
        expect([v.colorId, v.color2Id]).toContain(qora);
      }
    });

    it('answers an empty PATCH as a true no-op — updated_at untouched', async () => {
      const list = await request(http)
        .get(`/api/product-variants?productId=${productId}`)
        .expect(200);
      const first = (list.body as VariantBody[])[0];

      const res = await request(http)
        .patch(`/api/product-variants/${first.id}`)
        .send({})
        .expect(200);

      const body = res.body as VariantBody;
      expect(body.sku).toBe(first.sku);
      expect(body.updatedAt).toBe(first.updatedAt);
    });

    it('rejects stealing another variant sku with 409', async () => {
      const list = await request(http)
        .get(`/api/product-variants?productId=${productId}`)
        .expect(200);
      const [a, b] = list.body as VariantBody[];

      await request(http)
        .patch(`/api/product-variants/${a.id}`)
        .send({ sku: b.sku })
        .expect(409);
    });
  });
});
