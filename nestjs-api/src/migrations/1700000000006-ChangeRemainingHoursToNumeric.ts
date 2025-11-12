import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeRemainingHoursToNumeric1700000000006
  implements MigrationInterface
{
  name = "ChangeRemainingHoursToNumeric1700000000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Thay đổi cột remaining_hours từ int sang numeric để lưu số thập phân
      await queryRunner.query(
        `ALTER TABLE records 
         ALTER COLUMN remaining_hours TYPE NUMERIC(10,2) 
         USING remaining_hours::numeric`
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
      // Revert về int (làm tròn)
      await queryRunner.query(
        `ALTER TABLE records 
         ALTER COLUMN remaining_hours TYPE INTEGER 
         USING ROUND(remaining_hours)::integer`
      );

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }
}

