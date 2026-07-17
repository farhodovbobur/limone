import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1784270907164 implements MigrationInterface {
  name = 'CreateUsersTable1784270907164';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" (
          "id" SERIAL NOT NULL,
          "username" character varying(50) NOT NULL,
          "first_name" character varying(100) NOT NULL,
          "last_name" character varying(100),
          "password_hash" character varying NOT NULL,
          "phone" character varying(20),
          "email" character varying(150),
          "role_id" integer NOT NULL,
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"),
          CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"),
          CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")
      )`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
