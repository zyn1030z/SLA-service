import { MigrationInterface, QueryRunner } from "typeorm";

export class SetIntIdDefaults1700000000001 implements MigrationInterface {
  name = "SetIntIdDefaults1700000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `ALTER TABLE systems ALTER COLUMN id SET DEFAULT nextval('systems_id_seq')`
      );
      await queryRunner.query(
        `ALTER SEQUENCE systems_id_seq OWNED BY systems.id`
      );

      await queryRunner.query(
        `ALTER TABLE workflows ALTER COLUMN id SET DEFAULT nextval('workflows_id_seq')`
      );
      await queryRunner.query(
        `ALTER SEQUENCE workflows_id_seq OWNED BY workflows.id`
      );

      await queryRunner.query(
        `ALTER TABLE activities ALTER COLUMN id SET DEFAULT nextval('activities_id_seq')`
      );
      await queryRunner.query(
        `ALTER SEQUENCE activities_id_seq OWNED BY activities.id`
      );

      await queryRunner.query(
        `ALTER TABLE transitions ALTER COLUMN id SET DEFAULT nextval('transitions_id_seq')`
      );
      await queryRunner.query(
        `ALTER SEQUENCE transitions_id_seq OWNED BY transitions.id`
      );

      await queryRunner.query(
        `ALTER TABLE records ALTER COLUMN id SET DEFAULT nextval('records_id_seq')`
      );
      await queryRunner.query(
        `ALTER SEQUENCE records_id_seq OWNED BY records.id`
      );

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }

  public async down(): Promise<void> {
    // no-op
  }
}


