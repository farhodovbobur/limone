import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogReferenceTables1786714865263 implements MigrationInterface {
  name = 'CreateCatalogReferenceTables1786714865263';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sizes" (
          "id" SERIAL NOT NULL,
          "name" character varying(20) NOT NULL,
          "translations" jsonb NOT NULL DEFAULT '{}',
          "sort_order" integer NOT NULL DEFAULT '0',
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_09ffc681886e25eb5ce3b319fab" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_9fc6e663546e7a6cfdc465e86df" UNIQUE ("name")
       )`,
    );

    await queryRunner.query(
      `CREATE TABLE "colors" (
           "id" SERIAL NOT NULL,
           "name" character varying(50) NOT NULL,
           "translations" jsonb NOT NULL DEFAULT '{}',
           "hex" character varying(7),
           "is_active" boolean NOT NULL DEFAULT true,
           "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
           "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
           CONSTRAINT "PK_3a62edc12d29307872ab1777ced" PRIMARY KEY ("id"),
           CONSTRAINT "UQ_cf12321fa0b7b9539e89c7dfeb7" UNIQUE ("name")
       )`,
    );

    await queryRunner.query(
      `CREATE TABLE "product_categories" (
          "id" SERIAL NOT NULL,
          "name" character varying(100) NOT NULL,
          "translations" jsonb NOT NULL DEFAULT '{}',
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_7069dac60d88408eca56fdc9e0c" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_a75bfadcd8291a0538ab7abfdcf" UNIQUE ("name")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "exchange_rates" (
          "id" SERIAL NOT NULL,
          "date" date NOT NULL,
          "rate" numeric(14,2) NOT NULL,
          "source" character varying(10) NOT NULL DEFAULT 'MANUAL',
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_33a614bad9e61956079d817ebe2" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_e4aee863d7ed5356a26eee10162" UNIQUE ("date")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "exchange_rates"`);
    await queryRunner.query(`DROP TABLE "colors"`);
    await queryRunner.query(`DROP TABLE "sizes"`);
    await queryRunner.query(`DROP TABLE "product_categories"`);
  }
}
