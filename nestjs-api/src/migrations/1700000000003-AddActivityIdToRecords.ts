import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActivityIdToRecords1700000000003
  implements MigrationInterface
{
  name = "AddActivityIdToRecords1700000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Add activity_id column to records table
      await queryRunner.query(
        `ALTER TABLE records ADD COLUMN IF NOT EXISTS activity_id INT NULL`
      );

      // Add index for better query performance
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_records_activity_id ON records(activity_id)`
      );

      // Add foreign key constraint (optional, can be disabled if needed)
      // await queryRunner.query(
      //   `ALTER TABLE records ADD CONSTRAINT fk_records_activity_id 
      //    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL`
      // );

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Drop index
      await queryRunner.query(
        `DROP INDEX IF EXISTS idx_records_activity_id`
      );

      // Drop column
      await queryRunner.query(
        `ALTER TABLE records DROP COLUMN IF EXISTS activity_id`
      );

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }
}

