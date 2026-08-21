import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/shared/guards/roles.guard';
import { internalCode } from '../src/catalog/barcode';

/**
 * Products and variants against a real PostgreSQL: SKU generation, the two
 * partial unique indexes, matrix idempotency, and the colour filter that must
 * see both slots. Guards have their own specs and are stubbed out.
 *
 * Every row this file creates carries an E2E-prefixed name, and both hooks
 * delete by that prefix — so a crashed run cannot poison the next one.
 */

// Auth is stubbed, but variant creation writes barcodes with a real
// created_by FK — so the stub must still put a user on the request.
const auth = { userId: 0 };
const allow = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    req.user = { sub: auth.userId };
    return true;
  },
};

type IdRow = { id: number };
type ProductBody = IdRow & {
  name: string;
  translations: Record<string, string>;
  categoryId: number | null;
  brandId: number | null;
  brand?: { id: number; name: string } | null;
  updatedAt: string;
};
type VariantBody = IdRow & {
  sku: string;
  colorId: number;
  color2Id: number | null;
  updatedAt: string;
};

describe('Catalog (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;

  let categoryId: number;
  let brandId: number;
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

    // A user of our own for created_by — inactive and unloggable, removed in
    // afterAll. Keeps the suite independent of whether the seeder has run.
    const users: { id: number }[] = await app.get(DataSource).query(
      `INSERT INTO users (username, first_name, password_hash, role_id, is_active)
         VALUES ('e2e-bot', 'E2E', 'not-a-login',
                 (SELECT id FROM roles WHERE name = 'superadmin'), false)
         ON CONFLICT (username) DO UPDATE SET first_name = EXCLUDED.first_name
         RETURNING id`,
    );
    auth.userId = users[0].id;

    await clean();

    // Reference rows this file owns, created through the real API.
    categoryId = await post<IdRow>('/api/product-categories', {
      name: 'E2E Category',
    }).then((r) => r.id);
    brandId = await post<IdRow>('/api/brands', {
      name: 'E2E Brand',
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
    await app
      .get(DataSource)
      .query(`DELETE FROM users WHERE username = 'e2e-bot'`);
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
      `DELETE FROM product_barcodes
        WHERE variant_id IN (
          SELECT v.id FROM product_variants v
          JOIN products p ON p.id = v.product_id
          WHERE p.name LIKE 'E2E%')`,
    );
    await ds.query(
      `DELETE FROM product_variants
        WHERE product_id IN (SELECT id FROM products WHERE name LIKE 'E2E%')`,
    );
    await ds.query(`DELETE FROM products WHERE name LIKE 'E2E%'`);
    await ds.query(`DELETE FROM sizes WHERE name IN ('E2S', 'E2M')`);
    await ds.query(`DELETE FROM colors WHERE name LIKE 'E2E %'`);
    await ds.query(`DELETE FROM product_categories WHERE name LIKE 'E2E %'`);
    await ds.query(`DELETE FROM brands WHERE name LIKE 'E2E %'`);
  }

  describe('brands', () => {
    it('refuses translations — a brand name reads the same in every locale (D18)', async () => {
      await request(http)
        .post('/api/brands')
        .send({ name: 'E2E Zara', translations: { ru: 'Зара' } })
        .expect(400);
    });

    it('takes a logo and lets it go — optional in both directions', async () => {
      const brand = await post<IdRow & { logo: string | null }>('/api/brands', {
        name: 'E2E Puma',
        logo: 'brands/puma.png',
      });
      expect(brand.logo).toBe('brands/puma.png');

      const res = await request(http)
        .patch(`/api/brands/${brand.id}`)
        .send({ logo: null })
        .expect(200);

      expect((res.body as { logo: string | null }).logo).toBeNull();
    });
  });

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

    it('carries a brand, joins its name, and filters by it', async () => {
      const created = await post<ProductBody>('/api/products', {
        name: 'E2E Adidas Koylak',
        brandId,
      });
      expect(created.brandId).toBe(brandId);

      const res = await request(http)
        .get(`/api/products?brandId=${brandId}`)
        .expect(200);

      const rows = res.body as ProductBody[];
      const names = rows.map((p) => p.name);
      expect(names).toContain('E2E Adidas Koylak');
      // The brandless product must drop out, or the filter is decorative.
      expect(names).not.toContain('E2E Koylak');
      expect(rows[0].brand?.name).toBe('E2E Brand');
    });

    it('404s a nonexistent brand instead of leaking the FK error', async () => {
      await request(http)
        .post('/api/products')
        .send({ name: 'E2E Nike Koylak', brandId: 999999 })
        .expect(404);
    });

    it('clears the brand on PATCH — own production carries no label', async () => {
      const product = await post<ProductBody>('/api/products', {
        name: 'E2E Own Koylak',
        brandId,
      });

      const res = await request(http)
        .patch(`/api/products/${product.id}`)
        .send({ brandId: null })
        .expect(200);

      expect((res.body as ProductBody).brandId).toBeNull();
    });
  });

  describe('variants', () => {
    type CreateBody = {
      created: number;
      skipped: number;
      variants: VariantBody[];
    };

    it('creates a single variant through the same endpoint — a 1 × 1 matrix', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({ productId, sizeIds: [sizeS], colors: [{ colorId: qora }] })
        .expect(201);

      const body = res.body as CreateBody;
      expect(body).toMatchObject({ created: 1, skipped: 0 });
      expect(body.variants[0].sku).toBe('E2E01-E2S-E2EQORA');
    });

    it('skips the same combination on a re-send instead of duplicating it', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({ productId, sizeIds: [sizeS], colors: [{ colorId: qora }] })
        .expect(201);

      expect(res.body as CreateBody).toMatchObject({ created: 0, skipped: 1 });
    });

    it('the database itself refuses a duplicate solid combination (partial unique index)', async () => {
      await expect(
        app.get(DataSource).query(
          `INSERT INTO product_variants (product_id, size_id, color_id, sku)
             VALUES ($1, $2, $3, 'E2E-DUP')`,
          [productId, sizeS, qora],
        ),
      ).rejects.toThrow(/UQ_variant_one_colour/);
    });

    it('appends the second colour to the SKU', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({
          productId,
          sizeIds: [sizeS],
          colors: [{ colorId: qora, color2Id: oq }],
        })
        .expect(201);

      expect((res.body as CreateBody).variants[0].sku).toBe(
        'E2E01-E2S-E2EQORA-E2EOQ',
      );
    });

    it('treats the reversed pair as a different garment (D17)', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({
          productId,
          sizeIds: [sizeS],
          colors: [{ colorId: oq, color2Id: qora }],
        })
        .expect(201);

      expect((res.body as CreateBody).variants[0].sku).toBe(
        'E2E01-E2S-E2EOQ-E2EQORA',
      );
    });

    it('rejects two identical colours with 400', async () => {
      await request(http)
        .post('/api/product-variants')
        .send({
          productId,
          sizeIds: [sizeM],
          colors: [{ colorId: qora, color2Id: qora }],
        })
        .expect(400);
    });

    it('names the missing reference in a 404', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({ productId, sizeIds: [999999], colors: [{ colorId: qora }] })
        .expect(404);

      expect((res.body as { message: string }).message).toContain('999999');
    });

    it('a full matrix creates the missing combinations and skips the existing one', async () => {
      // (S, qora) already exists as a solid; the other three are new.
      const res = await request(http)
        .post('/api/product-variants')
        .send({
          productId,
          sizeIds: [sizeS, sizeM],
          colors: [{ colorId: qora }, { colorId: oq }],
        })
        .expect(201);

      expect(res.body as CreateBody).toMatchObject({ created: 3, skipped: 1 });
    });

    it('re-sending the matrix is a clean no-op', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({
          productId,
          sizeIds: [sizeS, sizeM],
          colors: [{ colorId: qora }, { colorId: oq }],
        })
        .expect(201);

      expect(res.body as CreateBody).toMatchObject({ created: 0, skipped: 4 });
    });

    it('duplicates inside one payload are skipped, not a 500', async () => {
      const res = await request(http)
        .post('/api/product-variants')
        .send({
          productId,
          sizeIds: [sizeM, sizeM],
          colors: [{ colorId: kok }],
        })
        .expect(201);

      expect(res.body as CreateBody).toMatchObject({ created: 1, skipped: 1 });
    });

    it('the old /matrix route is gone', async () => {
      await request(http)
        .post('/api/product-variants/matrix')
        .send({ productId, sizeIds: [sizeM], colors: [{ colorId: kok }] })
        .expect(404);
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

  describe('barcodes', () => {
    type BarcodeRow = { id: number; code: string; type: string };

    async function firstVariant(): Promise<VariantBody> {
      const list = await request(http)
        .get(`/api/product-variants?productId=${productId}`)
        .expect(200);
      return (list.body as VariantBody[])[0];
    }

    it('every variant was born with exactly one INTERNAL code, matrix included', async () => {
      const counts: { variants: string; internals: string }[] = await app
        .get(DataSource)
        .query(
          `SELECT
              (SELECT count(*) FROM product_variants WHERE product_id = $1) AS variants,
              (SELECT count(*) FROM product_barcodes b
                JOIN product_variants v ON v.id = b.variant_id
                WHERE v.product_id = $1 AND b.type = 'INTERNAL') AS internals`,
          [productId],
        );

      expect(counts[0].internals).toBe(counts[0].variants);
      expect(Number(counts[0].variants)).toBeGreaterThan(0);
    });

    it('the INTERNAL code is the documented shape: 7 id digits + check', async () => {
      const variant = await firstVariant();
      const res = await request(http)
        .get(`/api/product-barcodes?variantId=${variant.id}`)
        .expect(200);

      const internal = (res.body as BarcodeRow[]).find(
        (b) => b.type === 'INTERNAL',
      );
      expect(internal?.code).toBe(internalCode(variant.id));
    });

    it('by-code resolves the internal code to its variant', async () => {
      const variant = await firstVariant();
      const res = await request(http)
        .get(`/api/product-variants/by-code?code=${internalCode(variant.id)}`)
        .expect(200);

      expect((res.body as VariantBody).id).toBe(variant.id);
    });

    it('by-code 400s our shape with a broken check digit', async () => {
      const variant = await firstVariant();
      const good = internalCode(variant.id);
      const bad = good.slice(0, 7) + String((Number(good.at(-1)) + 1) % 10);

      await request(http)
        .get(`/api/product-variants/by-code?code=${bad}`)
        .expect(400);
    });

    it('by-code 404s an unknown code — the learn flow entrance', async () => {
      await request(http)
        .get('/api/product-variants/by-code?code=9990001112223')
        .expect(404);
    });

    it('learns a supplier code and resolves it case-insensitively', async () => {
      const variant = await firstVariant();
      await request(http)
        .post('/api/product-barcodes')
        .send({
          variantId: variant.id,
          code: 'abc-123',
          type: 'SUPPLIER',
          note: 'E2E supplier',
        })
        .expect(201);

      const res = await request(http)
        .get('/api/product-variants/by-code')
        .query({ code: '  abc-123 ' })
        .expect(200);

      expect((res.body as VariantBody).id).toBe(variant.id);
    });

    it('refuses the same code on a second variant, naming the holder', async () => {
      const list = await request(http)
        .get(`/api/product-variants?productId=${productId}`)
        .expect(200);
      const second = (list.body as VariantBody[])[1];

      const res = await request(http)
        .post('/api/product-barcodes')
        .send({ variantId: second.id, code: 'ABC-123', type: 'SUPPLIER' })
        .expect(409);

      expect((res.body as { message: string }).message).toContain('E2E01');
    });

    it('validates an EAN13 row: bad check digit 400, real one 201', async () => {
      const variant = await firstVariant();

      await request(http)
        .post('/api/product-barcodes')
        .send({ variantId: variant.id, code: '4006381333930', type: 'EAN13' })
        .expect(400);

      await request(http)
        .post('/api/product-barcodes')
        .send({ variantId: variant.id, code: '4006381333931', type: 'EAN13' })
        .expect(201);
    });

    it('refuses to learn a code in our own internal shape', async () => {
      const variant = await firstVariant();

      await request(http)
        .post('/api/product-barcodes')
        .send({ variantId: variant.id, code: '99999995', type: 'SUPPLIER' })
        .expect(400);
    });

    it('by-code 400s a repeated query key instead of crashing', async () => {
      await request(http)
        .get('/api/product-variants/by-code?code=00000413&code=x')
        .expect(400);
    });

    it('never accepts INTERNAL from a client', async () => {
      const variant = await firstVariant();

      await request(http)
        .post('/api/product-barcodes')
        .send({ variantId: variant.id, code: '00000010', type: 'INTERNAL' })
        .expect(400);
    });

    it('deletes a supplier code — and the scan forgets it', async () => {
      const variant = await firstVariant();
      const rows = await request(http)
        .get(`/api/product-barcodes?variantId=${variant.id}`)
        .expect(200);
      const supplier = (rows.body as BarcodeRow[]).find(
        (b) => b.code === 'ABC-123',
      );

      await request(http)
        .delete(`/api/product-barcodes/${supplier!.id}`)
        .expect(204);
      await request(http)
        .get('/api/product-variants/by-code?code=ABC-123')
        .expect(404);
    });

    it('refuses to delete an INTERNAL code', async () => {
      const variant = await firstVariant();
      const rows = await request(http)
        .get(`/api/product-barcodes?variantId=${variant.id}`)
        .expect(200);
      const internal = (rows.body as BarcodeRow[]).find(
        (b) => b.type === 'INTERNAL',
      );

      await request(http)
        .delete(`/api/product-barcodes/${internal!.id}`)
        .expect(400);
    });

    it('the database itself refuses a second INTERNAL code per variant', async () => {
      const variant = await firstVariant();

      await expect(
        app.get(DataSource).query(
          `INSERT INTO product_barcodes (variant_id, code, type, created_by)
            VALUES ($1, '99999995', 'INTERNAL', $2)`,
          [variant.id, auth.userId],
        ),
      ).rejects.toThrow(/UQ_barcode_internal_per_variant/);
    });

    it('the FK refuses to delete a variant that has codes in the wild', async () => {
      const variant = await firstVariant();

      await expect(
        app
          .get(DataSource)
          .query(`DELETE FROM product_variants WHERE id = $1`, [variant.id]),
      ).rejects.toThrow(/foreign key constraint/);
    });
  });
});
