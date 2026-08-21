import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductTables1787148780281 implements MigrationInterface {
  name = 'CreateProductTables1787148780281';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "products" (
          "id" SERIAL NOT NULL,
          "name" character varying(150) NOT NULL,
          "translations" jsonb NOT NULL DEFAULT '{}',
          "code" character varying(30),
          "category_id" integer,
          "notes" text,
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_4c9fb58de893725258746385e16" UNIQUE ("name"),
          CONSTRAINT "UQ_7cfc24d6c24f0ec91294003d6b8" UNIQUE ("code")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "product_variants" (
          "id" SERIAL NOT NULL,
          "product_id" integer NOT NULL,
          "size_id" integer NOT NULL,
          "color_id" integer NOT NULL,
          "color2_id" integer,
          "sku" character varying(60) NOT NULL,
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_281e3f2c55652d6a22c0aa59fd7" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_46f236f21640f9da218a063a866" UNIQUE ("sku")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_9a5f6868c96e0069e699f33e12" ON "products" ("category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6343513e20e2deab45edfce131" ON "product_variants" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf3e96b7fc720a0ea3a8195337" ON "product_variants" ("size_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b91b27dcad5b2bdb13977a176" ON "product_variants" ("color_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2cf76df76ada8b14e4ae682783" ON "product_variants" ("color2_id")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_variant_one_colour"
          ON "product_variants" ("product_id", "size_id", "color_id")
          WHERE "color2_id" IS NULL`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_variant_two_colours"
          ON "product_variants" ("product_id", "size_id", "color_id", "color2_id")
          WHERE "color2_id" IS NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "products"
          ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"
          FOREIGN KEY ("category_id") REFERENCES "product_categories"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "product_variants"
          ADD CONSTRAINT "FK_6343513e20e2deab45edfce1316"
          FOREIGN KEY ("product_id") REFERENCES "products"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "product_variants"
          ADD CONSTRAINT "FK_bf3e96b7fc720a0ea3a81953373"
          FOREIGN KEY ("size_id") REFERENCES "sizes"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "product_variants"
          ADD CONSTRAINT "FK_8b91b27dcad5b2bdb13977a176d"
          FOREIGN KEY ("color_id") REFERENCES "colors"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "product_variants"
          ADD CONSTRAINT "FK_2cf76df76ada8b14e4ae6827838"
          FOREIGN KEY ("color2_id") REFERENCES "colors"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "FK_2cf76df76ada8b14e4ae6827838"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "FK_8b91b27dcad5b2bdb13977a176d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "FK_bf3e96b7fc720a0ea3a81953373"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "FK_6343513e20e2deab45edfce1316"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_variant_two_colours"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_variant_one_colour"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2cf76df76ada8b14e4ae682783"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8b91b27dcad5b2bdb13977a176"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bf3e96b7fc720a0ea3a8195337"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6343513e20e2deab45edfce131"`,
    );
    await queryRunner.query(`DROP TABLE "product_variants"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a5f6868c96e0069e699f33e12"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
