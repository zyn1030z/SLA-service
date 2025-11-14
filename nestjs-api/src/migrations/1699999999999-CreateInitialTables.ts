import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialTables1699999999999 implements MigrationInterface {
  name = "CreateInitialTables1699999999999";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Create systems table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS systems (
          id SERIAL PRIMARY KEY,
          system_name VARCHAR NOT NULL,
          description TEXT,
          base_url TEXT,
          api_key TEXT,
          enabled BOOLEAN DEFAULT false,
          status VARCHAR DEFAULT 'disconnected',
          workflows_count INT DEFAULT 0,
          violations_count INT DEFAULT 0,
          color VARCHAR DEFAULT '#3B82F6',
          icon VARCHAR DEFAULT '🏢',
          last_sync TIMESTAMPTZ,
          workflow_endpoint TEXT,
          api_method VARCHAR DEFAULT 'POST',
          api_headers JSONB,
          api_request_body JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create workflows table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS workflows (
          id SERIAL PRIMARY KEY,
          system_id INT NOT NULL,
          system_name VARCHAR NOT NULL,
          workflow_id INT,
          workflow_name VARCHAR NOT NULL,
          model VARCHAR NOT NULL,
          steps INT DEFAULT 0,
          violations INT DEFAULT 0,
          status VARCHAR DEFAULT 'active',
          odoo_workflow_id INT,
          on_create BOOLEAN DEFAULT false,
          share BOOLEAN DEFAULT false,
          domain TEXT,
          note TEXT,
          activity_count INT DEFAULT 0,
          activities_json JSONB,
          notify_api_config JSONB,
          auto_approve_api_config JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Create index for workflows
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_workflows_system_id_model ON workflows(system_id, model)
      `);

      // Create activities table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS activities (
          id SERIAL PRIMARY KEY,
          workflow_id INT NOT NULL,
          activity_id INT NOT NULL,
          name VARCHAR NOT NULL,
          code VARCHAR,
          kind VARCHAR NOT NULL,
          split_mode VARCHAR NOT NULL,
          join_mode VARCHAR NOT NULL,
          flow_start BOOLEAN DEFAULT false,
          flow_stop BOOLEAN DEFAULT false,
          flow_cancel BOOLEAN DEFAULT false,
          flow_done BOOLEAN DEFAULT false,
          action TEXT,
          note TEXT,
          violation_action VARCHAR DEFAULT 'notify',
          sla_hours INT DEFAULT 24,
          max_violations INT DEFAULT 3,
          is_active BOOLEAN DEFAULT true,
          notify_api_config JSONB,
          auto_approve_api_config JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Create index for activities
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_activities_workflow_id_id ON activities(workflow_id, id)
      `);

      // Create transitions table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS transitions (
          id SERIAL PRIMARY KEY,
          activity_id INT NOT NULL,
          transition_id INT NOT NULL,
          signal VARCHAR NOT NULL,
          condition TEXT,
          sequence INT DEFAULT 0,
          target_activity_id INT NOT NULL,
          target_activity_name VARCHAR NOT NULL,
          group_required BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Create index for transitions
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_transitions_activity_id_id ON transitions(activity_id, id)
      `);

      // Create records table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS records (
          id SERIAL PRIMARY KEY,
          record_id VARCHAR NOT NULL,
          model VARCHAR NOT NULL,
          workflow_id INT,
          system_id INT,
          workflow_name VARCHAR,
          activity_id INT,
          step_code VARCHAR,
          step_name VARCHAR,
          start_time TIMESTAMPTZ,
          status VARCHAR DEFAULT 'waiting',
          violation_count INT DEFAULT 0,
          sla_hours INT DEFAULT 24,
          remaining_hours NUMERIC(10, 2) DEFAULT 0,
          user_approve JSONB,
          approved_at TIMESTAMPTZ,
          next_due_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create indexes for records
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_records_workflow_id ON records(workflow_id)
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_records_system_id ON records(system_id)
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_records_activity_id ON records(activity_id)
      `);

      // Note: sla_action_logs table will be created by migration 1700000000007-CreateSlaActionLogs

      // Create sla_tracking table (if needed)
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS sla_tracking (
          id SERIAL PRIMARY KEY,
          record_id INT NOT NULL,
          remaining_hours NUMERIC(10, 2),
          status VARCHAR,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`DROP TABLE IF EXISTS sla_tracking`);
      // Note: sla_action_logs will be dropped by migration 1700000000007-CreateSlaActionLogs
      await queryRunner.query(`DROP TABLE IF EXISTS records`);
      await queryRunner.query(`DROP TABLE IF EXISTS transitions`);
      await queryRunner.query(`DROP TABLE IF EXISTS activities`);
      await queryRunner.query(`DROP TABLE IF EXISTS workflows`);
      await queryRunner.query(`DROP TABLE IF EXISTS systems`);
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }
}

