import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNextDueAtToRecords1700000000010
  implements MigrationInterface
{
  name = "AddNextDueAtToRecords1700000000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `ALTER TABLE records ADD COLUMN IF NOT EXISTS next_due_at timestamptz`
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
        `ALTER TABLE records DROP COLUMN IF EXISTS next_due_at`
      );
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }
}

