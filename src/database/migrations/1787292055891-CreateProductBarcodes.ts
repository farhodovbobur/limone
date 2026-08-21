import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductBarcodes1787292055891 implements MigrationInterface {
  name = 'CreateProductBarcodes1787292055891';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_barcodes" (
          "id" SERIAL NOT NULL,
          "variant_id" integer NOT NULL,
          "code" character varying(32) NOT NULL,
          "type" character varying(10) NOT NULL,
          "note" character varying(255),
          "created_by" integer NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_459d7d53aebb732e6c8460247d6" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_8af65ccf2348282f81fe79c3c82" UNIQUE ("code")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_271eb3797181936ef9a33e6294" ON "product_barcodes" ("variant_id")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_barcode_internal_per_variant"
          ON "product_barcodes" ("variant_id")
          WHERE "type" = 'INTERNAL'`,
    );

    await queryRunner.query(
      `ALTER TABLE "product_barcodes"
          ADD CONSTRAINT "FK_271eb3797181936ef9a33e62948"
          FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "product_barcodes"
          ADD CONSTRAINT "FK_e4db3caab863195a4f21da07a8f"
          FOREIGN KEY ("created_by") REFERENCES "users"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_barcodes" DROP CONSTRAINT "FK_e4db3caab863195a4f21da07a8f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_barcodes" DROP CONSTRAINT "FK_271eb3797181936ef9a33e62948"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_barcode_internal_per_variant"`,);
    await queryRunner.query(`DROP INDEX "public"."IDX_271eb3797181936ef9a33e6294"`,);
    await queryRunner.query(`DROP TABLE "product_barcodes"`);
  }
}
