import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductPricesTable1787382534197 implements MigrationInterface {
  name = 'CreateProductPricesTable1787382534197';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_prices" (
          "id" SERIAL NOT NULL,
          "variant_id" integer NOT NULL,
          "date" date NOT NULL,
          "currency" character varying(3) NOT NULL,
          "rate" numeric(14,2),
          "cost" numeric(14,2) NOT NULL,
          "price" numeric(14,2) NOT NULL,
          "markup_fixed" numeric(14,2),
          "markup_percent" numeric,
          "note" text,
          "created_by" integer NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_31c33ddacf759f7c0e5d327c4bb" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_price_variant_date"
          ON "product_prices" ("variant_id", "date" DESC, "id" DESC)`,
    );

    await queryRunner.query(
      `ALTER TABLE "product_prices"
          ADD CONSTRAINT "FK_24ba10adbe347d03679f1f76ed7"
          FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
          ON DELETE RESTRICT 
          ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "product_prices"
          ADD CONSTRAINT "FK_716fab85c4e1389029c907510f9"
          FOREIGN KEY ("created_by") REFERENCES "users"("id")
          ON DELETE NO ACTION 
          ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "FK_716fab85c4e1389029c907510f9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "FK_24ba10adbe347d03679f1f76ed7"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_price_variant_date"`);
    await queryRunner.query(`DROP TABLE "product_prices"`);
  }
}
