import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserApproveToRecords1700000000008
  implements MigrationInterface
{
  name = "AddUserApproveToRecords1700000000008";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `ALTER TABLE records ADD COLUMN IF NOT EXISTS user_approve jsonb`
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
        `ALTER TABLE records DROP COLUMN IF EXISTS user_approve`
      );
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }
}
