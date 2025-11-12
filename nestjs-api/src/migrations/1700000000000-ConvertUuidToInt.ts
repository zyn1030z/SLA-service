import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertUuidToInt1700000000000 implements MigrationInterface {
  name = "ConvertUuidToInt1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // 1) systems: add int id and mapping
      await queryRunner.query(`ALTER TABLE systems ADD COLUMN id_int INT`);
      await queryRunner.query(
        `CREATE SEQUENCE IF NOT EXISTS systems_id_seq OWNED BY systems.id_int`
      );
      await queryRunner.query(
        `UPDATE systems SET id_int = NEXTVAL('systems_id_seq')`
      );
      await queryRunner.query(
        `ALTER TABLE systems ALTER COLUMN id_int SET NOT NULL`
      );
      // drop dependent FKs referencing systems before changing PK
      await queryRunner.query(`
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN
            SELECT c.conname, c.conrelid::regclass AS tbl
            FROM pg_constraint c
            WHERE c.contype = 'f' AND c.confrelid = 'public.systems'::regclass
          LOOP
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
          END LOOP;
        END$$;
      `);
      // drop old PK first, then add new PK on id_int
      // Drop existing primary key (dynamic name-safe)
      await queryRunner.query(`
        DO $$
        DECLARE pk_name text;
        BEGIN
          SELECT conname INTO pk_name
          FROM pg_constraint
          WHERE conrelid = 'public.systems'::regclass AND contype = 'p';
          IF pk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.systems DROP CONSTRAINT %I', pk_name);
          END IF;
        END$$;
      `);
      await queryRunner.query(`ALTER TABLE systems ADD CONSTRAINT systems_pkey_new PRIMARY KEY (id_int)`);
      await queryRunner.query(
        `CREATE TABLE IF NOT EXISTS systems_id_map AS SELECT id AS old_id, id_int AS new_id FROM systems`
      );
      await queryRunner.query(`ALTER TABLE systems RENAME COLUMN id TO id_uuid`);
      await queryRunner.query(`ALTER TABLE systems RENAME COLUMN id_int TO id`);

      // 2) workflows: convert id and map system_id
      await queryRunner.query(`ALTER TABLE workflows ADD COLUMN id_int INT`);
      await queryRunner.query(
        `CREATE SEQUENCE IF NOT EXISTS workflows_id_seq OWNED BY workflows.id_int`
      );
      await queryRunner.query(
        `UPDATE workflows SET id_int = NEXTVAL('workflows_id_seq')`
      );
      await queryRunner.query(
        `ALTER TABLE workflows ALTER COLUMN id_int SET NOT NULL`
      );
      // Drop dependent FKs referencing workflows before changing its PK
      await queryRunner.query(`
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN
            SELECT c.conname, c.conrelid::regclass AS tbl
            FROM pg_constraint c
            WHERE c.contype = 'f' AND c.confrelid = 'public.workflows'::regclass
          LOOP
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
          END LOOP;
        END$$;
      `);
      await queryRunner.query(`
        DO $$
        DECLARE pk_name text;
        BEGIN
          SELECT conname INTO pk_name
          FROM pg_constraint
          WHERE conrelid = 'public.workflows'::regclass AND contype = 'p';
          IF pk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.workflows DROP CONSTRAINT %I', pk_name);
          END IF;
        END$$;
      `);
      await queryRunner.query(`ALTER TABLE workflows ADD CONSTRAINT workflows_pkey_new PRIMARY KEY (id_int)`);
      await queryRunner.query(
        `ALTER TABLE workflows ADD COLUMN system_id_int INT`
      );
      await queryRunner.query(
        `UPDATE workflows w
         SET system_id_int = m.new_id
         FROM systems_id_map m
         WHERE w.system_id::text = m.old_id::text`
      );
      await queryRunner.query(`ALTER TABLE workflows RENAME COLUMN id TO id_uuid`);
      await queryRunner.query(`ALTER TABLE workflows RENAME COLUMN id_int TO id`);
      await queryRunner.query(
        `ALTER TABLE workflows RENAME COLUMN system_id TO system_id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE workflows RENAME COLUMN system_id_int TO system_id`
      );

      await queryRunner.query(
        `CREATE TABLE IF NOT EXISTS workflows_id_map AS SELECT id_uuid AS old_id, id AS new_id FROM workflows`
      );

      // 3) activities: convert id and map workflow_id
      await queryRunner.query(`ALTER TABLE activities ADD COLUMN id_int INT`);
      await queryRunner.query(
        `CREATE SEQUENCE IF NOT EXISTS activities_id_seq OWNED BY activities.id_int`
      );
      await queryRunner.query(
        `UPDATE activities SET id_int = NEXTVAL('activities_id_seq')`
      );
      await queryRunner.query(
        `ALTER TABLE activities ALTER COLUMN id_int SET NOT NULL`
      );
      // Drop dependent FKs referencing activities before changing its PK
      await queryRunner.query(`
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN
            SELECT c.conname, c.conrelid::regclass AS tbl
            FROM pg_constraint c
            WHERE c.contype = 'f' AND c.confrelid = 'public.activities'::regclass
          LOOP
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
          END LOOP;
        END$$;
      `);
      await queryRunner.query(`
        DO $$
        DECLARE pk_name text;
        BEGIN
          SELECT conname INTO pk_name
          FROM pg_constraint
          WHERE conrelid = 'public.activities'::regclass AND contype = 'p';
          IF pk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.activities DROP CONSTRAINT %I', pk_name);
          END IF;
        END$$;
      `);
      await queryRunner.query(`ALTER TABLE activities ADD CONSTRAINT activities_pkey_new PRIMARY KEY (id_int)`);
      await queryRunner.query(
        `ALTER TABLE activities ADD COLUMN workflow_id_int INT`
      );
      await queryRunner.query(
        `UPDATE activities a
         SET workflow_id_int = m.new_id
         FROM workflows_id_map m
         WHERE a.workflow_id::text = m.old_id::text`
      );
      await queryRunner.query(`ALTER TABLE activities RENAME COLUMN id TO id_uuid`);
      await queryRunner.query(`ALTER TABLE activities RENAME COLUMN id_int TO id`);
      await queryRunner.query(
        `ALTER TABLE activities RENAME COLUMN workflow_id TO workflow_id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE activities RENAME COLUMN workflow_id_int TO workflow_id`
      );

      await queryRunner.query(
        `CREATE TABLE IF NOT EXISTS activities_id_map AS SELECT id_uuid AS old_id, id AS new_id FROM activities`
      );

      // 4) transitions: convert id and map activity_id
      await queryRunner.query(`ALTER TABLE transitions ADD COLUMN id_int INT`);
      await queryRunner.query(
        `CREATE SEQUENCE IF NOT EXISTS transitions_id_seq OWNED BY transitions.id_int`
      );
      await queryRunner.query(
        `UPDATE transitions SET id_int = NEXTVAL('transitions_id_seq')`
      );
      await queryRunner.query(
        `ALTER TABLE transitions ALTER COLUMN id_int SET NOT NULL`
      );
      await queryRunner.query(`
        DO $$
        DECLARE pk_name text;
        BEGIN
          SELECT conname INTO pk_name
          FROM pg_constraint
          WHERE conrelid = 'public.transitions'::regclass AND contype = 'p';
          IF pk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.transitions DROP CONSTRAINT %I', pk_name);
          END IF;
        END$$;
      `);
      await queryRunner.query(`ALTER TABLE transitions ADD CONSTRAINT transitions_pkey_new PRIMARY KEY (id_int)`);
      await queryRunner.query(
        `ALTER TABLE transitions ADD COLUMN activity_id_int INT`
      );
      await queryRunner.query(
        `UPDATE transitions t
         SET activity_id_int = m.new_id
         FROM activities_id_map m
         WHERE t.activity_id::text = m.old_id::text`
      );
      await queryRunner.query(
        `ALTER TABLE transitions RENAME COLUMN id TO id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE transitions RENAME COLUMN id_int TO id`
      );
      await queryRunner.query(
        `ALTER TABLE transitions RENAME COLUMN activity_id TO activity_id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE transitions RENAME COLUMN activity_id_int TO activity_id`
      );

      // 5) records: convert id and map system_id, workflow_id
      await queryRunner.query(`ALTER TABLE records ADD COLUMN id_int INT`);
      await queryRunner.query(
        `CREATE SEQUENCE IF NOT EXISTS records_id_seq OWNED BY records.id_int`
      );
      await queryRunner.query(
        `UPDATE records SET id_int = NEXTVAL('records_id_seq')`
      );
      await queryRunner.query(
        `ALTER TABLE records ALTER COLUMN id_int SET NOT NULL`
      );
      await queryRunner.query(`
        DO $$
        DECLARE pk_name text;
        BEGIN
          SELECT conname INTO pk_name
          FROM pg_constraint
          WHERE conrelid = 'public.records'::regclass AND contype = 'p';
          IF pk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.records DROP CONSTRAINT %I', pk_name);
          END IF;
        END$$;
      `);
      await queryRunner.query(`ALTER TABLE records ADD CONSTRAINT records_pkey_new PRIMARY KEY (id_int)`);
      await queryRunner.query(
        `ALTER TABLE records ADD COLUMN system_id_int INT`
      );
      await queryRunner.query(
        `ALTER TABLE records ADD COLUMN workflow_id_int INT`
      );
      await queryRunner.query(
        `UPDATE records r
         SET system_id_int = s.new_id
         FROM systems_id_map s
         WHERE r.system_id::text = s.old_id::text`
      );
      await queryRunner.query(
        `UPDATE records r
         SET workflow_id_int = w.new_id
         FROM workflows_id_map w
         WHERE r.workflow_id::text = w.old_id::text`
      );
      await queryRunner.query(`ALTER TABLE records RENAME COLUMN id TO id_uuid`);
      await queryRunner.query(`ALTER TABLE records RENAME COLUMN id_int TO id`);
      await queryRunner.query(
        `ALTER TABLE records RENAME COLUMN system_id TO system_id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE records RENAME COLUMN system_id_int TO system_id`
      );
      await queryRunner.query(
        `ALTER TABLE records RENAME COLUMN workflow_id TO workflow_id_uuid`
      );
      await queryRunner.query(
        `ALTER TABLE records RENAME COLUMN workflow_id_int TO workflow_id`
      );

      // Clean up mapping tables
      await queryRunner.query(`DROP TABLE IF EXISTS activities_id_map`);
      await queryRunner.query(`DROP TABLE IF EXISTS workflows_id_map`);
      await queryRunner.query(`DROP TABLE IF EXISTS systems_id_map`);

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration: revert is complex; for brevity, throw to prevent accidental rollback.
    // If needed, implement reverse mapping using *_uuid columns to restore UUID PKs.
    throw new Error(
      "Down migration not implemented for ConvertUuidToInt. Restore from backup."
    );
  }
}


