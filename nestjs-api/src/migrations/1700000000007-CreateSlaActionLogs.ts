import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSlaActionLogs1700000000007 implements MigrationInterface {
  name = "CreateSlaActionLogs1700000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Drop table if it exists with old structure (from CreateInitialTables migration)
      await queryRunner.query(`DROP TABLE IF EXISTS sla_action_logs`);

      // Create table with correct structure
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS sla_action_logs (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          record_id varchar NOT NULL,
          workflow_id integer,
          activity_id integer,
          action_type varchar NOT NULL,
          violation_count integer DEFAULT 0,
          is_success boolean DEFAULT false,
          message text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      // Create indexes
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_sla_action_logs_record_id
        ON sla_action_logs (record_id)
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_sla_action_logs_activity_id
        ON sla_action_logs (activity_id)
      `);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`DROP TABLE IF EXISTS sla_action_logs`);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }
}
