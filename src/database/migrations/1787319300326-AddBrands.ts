import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrands1787319300326 implements MigrationInterface {
  name = 'AddBrands1787319300326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "brands" (
          "id" SERIAL NOT NULL,
          "name" character varying(100) NOT NULL,
          "logo" character varying(255),
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_96db6bbbaa6f23cad26871339b6" UNIQUE ("name")
      )`,
    );

    await queryRunner.query(`ALTER TABLE "products" ADD "brand_id" integer`);

    await queryRunner.query(
      `CREATE INDEX "IDX_1530a6f15d3c79d1b70be98f2b" ON "products" ("brand_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "products"
          ADD CONSTRAINT "FK_1530a6f15d3c79d1b70be98f2be"
          FOREIGN KEY ("brand_id") REFERENCES "brands"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_1530a6f15d3c79d1b70be98f2be"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1530a6f15d3c79d1b70be98f2b"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "brand_id"`);
    await queryRunner.query(`DROP TABLE "brands"`);
  }
}
