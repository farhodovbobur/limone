import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolesTable1784270527211 implements MigrationInterface {
  name = 'CreateRolesTable1784270527211';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "roles" (
          "id" SERIAL NOT NULL,
          "name" character varying(50) NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name")
      )`,
    );

    await queryRunner.query(
      `INSERT INTO "roles" ("name") VALUES ('superadmin'), ('admin'), ('director'), ('warehouse_keeper'), ('workshop_manager'), ('worker'), ('sales'), ('customer')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
