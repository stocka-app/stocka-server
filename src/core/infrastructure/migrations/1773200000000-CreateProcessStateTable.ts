import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProcessStateTable1773200000000 implements MigrationInterface {
  name = 'CreateProcessStateTable1773200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "process_state" (
        "id" uuid NOT NULL,
        "process_name" character varying(100) NOT NULL,
        "correlation_id" character varying(255) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'started',
        "current_step" character varying(100) NOT NULL,
        "data" jsonb NOT NULL DEFAULT '{}',
        "error_message" text,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_process_state" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_process_state_process_name" ON "process_state" ("process_name")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_process_state_correlation_id" ON "process_state" ("correlation_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_process_state_status" ON "process_state" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_process_state_status"`);
    await queryRunner.query(`DROP INDEX "IDX_process_state_correlation_id"`);
    await queryRunner.query(`DROP INDEX "IDX_process_state_process_name"`);
    await queryRunner.query(`DROP TABLE "process_state"`);
  }
}
