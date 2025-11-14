import { MigrationInterface, QueryRunner } from "typeorm";

export class FixTableColumns1700000000011 implements MigrationInterface {
  name = "FixTableColumns1700000000011";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Fix systems table: rename name to system_name and add missing columns
      const systemsHasSystemName = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'systems' 
          AND column_name = 'system_name'
        )
      `);

      if (!systemsHasSystemName[0]?.exists) {
        // Rename name to system_name if it exists
        await queryRunner.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'systems' 
              AND column_name = 'name'
            ) THEN
              ALTER TABLE systems RENAME COLUMN name TO system_name;
            END IF;
          END $$;
        `);

        // Add missing columns to systems
        await queryRunner.query(`
          ALTER TABLE systems 
          ADD COLUMN IF NOT EXISTS description TEXT,
          ADD COLUMN IF NOT EXISTS base_url TEXT,
          ADD COLUMN IF NOT EXISTS api_key TEXT,
          ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'disconnected',
          ADD COLUMN IF NOT EXISTS workflows_count INT DEFAULT 0,
          ADD COLUMN IF NOT EXISTS violations_count INT DEFAULT 0,
          ADD COLUMN IF NOT EXISTS color VARCHAR DEFAULT '#3B82F6',
          ADD COLUMN IF NOT EXISTS icon VARCHAR DEFAULT '🏢',
          ADD COLUMN IF NOT EXISTS last_sync TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS workflow_endpoint TEXT,
          ADD COLUMN IF NOT EXISTS api_method VARCHAR DEFAULT 'POST',
          ADD COLUMN IF NOT EXISTS api_headers JSONB,
          ADD COLUMN IF NOT EXISTS api_request_body JSONB;
        `);
      }

      // Fix workflows table: add system_name and other missing columns
      const workflowsHasSystemName = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'workflows' 
          AND column_name = 'system_name'
        )
      `);

      if (!workflowsHasSystemName[0]?.exists) {
        // Rename name to workflow_name if it exists and system_name doesn't
        await queryRunner.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'workflows' 
              AND column_name = 'name'
            ) AND NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'workflows' 
              AND column_name = 'workflow_name'
            ) THEN
              ALTER TABLE workflows RENAME COLUMN name TO workflow_name;
            END IF;
          END $$;
        `);

        // Add missing columns to workflows
        await queryRunner.query(`
          ALTER TABLE workflows 
          ADD COLUMN IF NOT EXISTS system_name VARCHAR,
          ADD COLUMN IF NOT EXISTS workflow_id INT,
          ADD COLUMN IF NOT EXISTS model VARCHAR,
          ADD COLUMN IF NOT EXISTS steps INT DEFAULT 0,
          ADD COLUMN IF NOT EXISTS violations INT DEFAULT 0,
          ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active',
          ADD COLUMN IF NOT EXISTS odoo_workflow_id INT,
          ADD COLUMN IF NOT EXISTS on_create BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS share BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS domain TEXT,
          ADD COLUMN IF NOT EXISTS note TEXT,
          ADD COLUMN IF NOT EXISTS activity_count INT DEFAULT 0,
          ADD COLUMN IF NOT EXISTS activities_json JSONB,
          ADD COLUMN IF NOT EXISTS notify_api_config JSONB,
          ADD COLUMN IF NOT EXISTS auto_approve_api_config JSONB;
        `);

        // Create index for workflows if not exists
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_workflows_system_id_model ON workflows(system_id, model)
        `);
      }

      // Fix activities table: add missing columns
      const activitiesHasActivityId = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'activities' 
          AND column_name = 'activity_id'
        )
      `);

      if (!activitiesHasActivityId[0]?.exists) {
        await queryRunner.query(`
          ALTER TABLE activities 
          ADD COLUMN IF NOT EXISTS activity_id INT,
          ADD COLUMN IF NOT EXISTS code VARCHAR,
          ADD COLUMN IF NOT EXISTS kind VARCHAR,
          ADD COLUMN IF NOT EXISTS split_mode VARCHAR,
          ADD COLUMN IF NOT EXISTS join_mode VARCHAR,
          ADD COLUMN IF NOT EXISTS flow_start BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS flow_stop BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS flow_cancel BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS flow_done BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS action TEXT,
          ADD COLUMN IF NOT EXISTS note TEXT,
          ADD COLUMN IF NOT EXISTS violation_action VARCHAR DEFAULT 'notify',
          ADD COLUMN IF NOT EXISTS sla_hours INT DEFAULT 24,
          ADD COLUMN IF NOT EXISTS max_violations INT DEFAULT 3,
          ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS notify_api_config JSONB,
          ADD COLUMN IF NOT EXISTS auto_approve_api_config JSONB;
        `);

        // Create index for activities if not exists
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_activities_workflow_id_id ON activities(workflow_id, id)
        `);
      }

      // Fix transitions table: add missing columns
      const transitionsHasTransitionId = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'transitions' 
          AND column_name = 'transition_id'
        )
      `);

      if (!transitionsHasTransitionId[0]?.exists) {
        await queryRunner.query(`
          ALTER TABLE transitions 
          ADD COLUMN IF NOT EXISTS transition_id INT,
          ADD COLUMN IF NOT EXISTS signal VARCHAR,
          ADD COLUMN IF NOT EXISTS condition TEXT,
          ADD COLUMN IF NOT EXISTS sequence INT DEFAULT 0,
          ADD COLUMN IF NOT EXISTS target_activity_id INT,
          ADD COLUMN IF NOT EXISTS target_activity_name VARCHAR,
          ADD COLUMN IF NOT EXISTS group_required BOOLEAN DEFAULT false;
        `);

        // Drop old columns if they exist
        await queryRunner.query(`
          ALTER TABLE transitions 
          DROP COLUMN IF EXISTS from_step,
          DROP COLUMN IF EXISTS to_step;
        `);

        // Create index for transitions if not exists
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_transitions_activity_id_id ON transitions(activity_id, id)
        `);
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration not implemented - this is a fix migration
    throw new Error("Down migration not implemented for FixTableColumns");
  }
}

