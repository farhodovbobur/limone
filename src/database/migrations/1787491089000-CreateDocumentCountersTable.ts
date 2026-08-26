import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentCountersTable1787491089000 implements MigrationInterface {
  name = 'CreateDocumentCountersTable1787491089000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "document_counters" (
          "scope" character varying(30) NOT NULL,
          "current" bigint NOT NULL,
          CONSTRAINT "PK_9ec05c059890aafbd8d1e01465a" PRIMARY KEY ("scope")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "document_counters"`);
  }
}
