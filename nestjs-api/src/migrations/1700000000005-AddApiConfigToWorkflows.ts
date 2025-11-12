import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApiConfigToWorkflows1700000000005
  implements MigrationInterface
{
  name = "AddApiConfigToWorkflows1700000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Add notify_api_config column to workflows table
      await queryRunner.query(
        `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS notify_api_config JSONB NULL`
      );

      // Add auto_approve_api_config column to workflows table
      await queryRunner.query(
        `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS auto_approve_api_config JSONB NULL`
      );

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Drop columns
      await queryRunner.query(
        `ALTER TABLE workflows DROP COLUMN IF EXISTS notify_api_config`
      );
      await queryRunner.query(
        `ALTER TABLE workflows DROP COLUMN IF EXISTS auto_approve_api_config`
      );

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }
}

