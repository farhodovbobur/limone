import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1784271804938 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1784271804938';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" (
          "id" SERIAL NOT NULL,
          "user_id" integer NOT NULL,
          "token_hash" character varying NOT NULL,
          "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          "revoked_at" TIMESTAMP WITH TIME ZONE,
          "replaced_by" integer,
          "user_agent" character varying,
          "ip" character varying(45),
          "browser" character varying(40),
          "os" character varying(40),
          "device_type" character varying(10),
          "location" character varying(80),
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a7838d2ba25be1342091b6695f" ON "refresh_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_444f2e9fbaaba23a2bfb7efd8d7" FOREIGN KEY ("replaced_by") REFERENCES "refresh_tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
