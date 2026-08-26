import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouseProductTables1787491089215 implements MigrationInterface {
  name = 'CreateWarehouseProductTables1787491089215';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "warehouse_product_documents" (
          "id" SERIAL NOT NULL,
          "number" character varying(30) NOT NULL,
          "type" character varying(10) NOT NULL,
          "date" date NOT NULL,
          "client_ref" character varying(64),
          "note" text,
          "reverses_document_id" integer,
          "created_by" integer NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_79a46d171f1315bb49332428b5c" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_4bf7a0825f623a50fb6153e59e5" UNIQUE ("number"),
          CONSTRAINT "UQ_aa9a824309a14d91c36e6956a1e" UNIQUE ("client_ref")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "warehouse_product_movements" (
          "id" SERIAL NOT NULL,
          "document_id" integer NOT NULL,
          "variant_id" integer NOT NULL,
          "qty" integer NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_db6e92ea963fdf7068bf677479e" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "warehouse_product_balances" (
          "id" SERIAL NOT NULL,
          "variant_id" integer NOT NULL,
          "qty" integer NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_6c07019914a4ec5619205293a03" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_document_reverses"
          ON "warehouse_product_documents" ("reverses_document_id")
          WHERE "reverses_document_id" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_movement_document" ON "warehouse_product_movements" ("document_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_movement_variant" ON "warehouse_product_movements" ("variant_id", "id")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_balance_variant" ON "warehouse_product_balances" ("variant_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "warehouse_product_documents"
          ADD CONSTRAINT "FK_b9bdaf5cf32f3ba2fae64900672"
          FOREIGN KEY ("reverses_document_id")
          REFERENCES "warehouse_product_documents"("id")
          ON DELETE RESTRICT 
          ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "warehouse_product_documents"
          ADD CONSTRAINT "FK_702c04d9643b5d77230874f6860"
          FOREIGN KEY ("created_by") REFERENCES "users"("id")
          ON DELETE RESTRICT 
          ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "warehouse_product_movements"
          ADD CONSTRAINT "FK_d00e50de752f079857e476daf66"
          FOREIGN KEY ("document_id")
          REFERENCES "warehouse_product_documents"("id")
          ON DELETE RESTRICT 
          ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "warehouse_product_movements"
          ADD CONSTRAINT "FK_618cfc068278a13ce67b6a7efdb"
          FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
          ON DELETE RESTRICT 
          ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "warehouse_product_balances"
          ADD CONSTRAINT "FK_c6627c346f6d487571e64d495cd"
          FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
          ON DELETE RESTRICT 
          ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "warehouse_product_balances" DROP CONSTRAINT "FK_c6627c346f6d487571e64d495cd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_product_movements" DROP CONSTRAINT "FK_618cfc068278a13ce67b6a7efdb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_product_movements" DROP CONSTRAINT "FK_d00e50de752f079857e476daf66"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_product_documents" DROP CONSTRAINT "FK_702c04d9643b5d77230874f6860"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_product_documents" DROP CONSTRAINT "FK_b9bdaf5cf32f3ba2fae64900672"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_balance_variant"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_movement_variant"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_movement_document"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_document_reverses"`);
    await queryRunner.query(`DROP TABLE "warehouse_product_balances"`);
    await queryRunner.query(`DROP TABLE "warehouse_product_movements"`);
    await queryRunner.query(`DROP TABLE "warehouse_product_documents"`);
  }
}
