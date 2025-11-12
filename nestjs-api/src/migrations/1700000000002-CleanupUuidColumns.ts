import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanupUuidColumns1700000000002 implements MigrationInterface {
  name = "CleanupUuidColumns1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // systems
      await queryRunner.query(
        `ALTER TABLE systems DROP COLUMN IF EXISTS id_uuid`
      );

      // workflows
      await queryRunner.query(
        `ALTER TABLE workflows DROP COLUMN IF EXISTS id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE workflows DROP COLUMN IF EXISTS system_id_uuid`
      );

      // activities
      await queryRunner.query(
        `ALTER TABLE activities DROP COLUMN IF EXISTS id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE activities DROP COLUMN IF EXISTS workflow_id_uuid`
      );

      // transitions
      await queryRunner.query(
        `ALTER TABLE transitions DROP COLUMN IF EXISTS id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE transitions DROP COLUMN IF EXISTS activity_id_uuid`
      );

      // records
      await queryRunner.query(
        `ALTER TABLE records DROP COLUMN IF EXISTS id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE records DROP COLUMN IF EXISTS system_id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE records DROP COLUMN IF EXISTS workflow_id_uuid`
      );

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }

  public async down(): Promise<void> {
    // No-op: legacy columns won't be restored
  }
}


