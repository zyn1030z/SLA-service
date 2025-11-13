import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApprovedAtToRecords1700000000009
  implements MigrationInterface
{
  name = "AddApprovedAtToRecords1700000000009";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `ALTER TABLE records ADD COLUMN IF NOT EXISTS approved_at timestamptz`
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
      await queryRunner.query(
        `ALTER TABLE records DROP COLUMN IF EXISTS approved_at`
      );
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }
}

