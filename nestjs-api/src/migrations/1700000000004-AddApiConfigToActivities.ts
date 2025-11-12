import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApiConfigToActivities1700000000004
  implements MigrationInterface
{
  name = "AddApiConfigToActivities1700000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Add notify_api_config column to activities table
      await queryRunner.query(
        `ALTER TABLE activities ADD COLUMN IF NOT EXISTS notify_api_config JSONB NULL`
      );

      // Add auto_approve_api_config column to activities table
      await queryRunner.query(
        `ALTER TABLE activities ADD COLUMN IF NOT EXISTS auto_approve_api_config JSONB NULL`
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
        `ALTER TABLE activities DROP COLUMN IF EXISTS notify_api_config`
      );
      await queryRunner.query(
        `ALTER TABLE activities DROP COLUMN IF EXISTS auto_approve_api_config`
      );

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }
}

