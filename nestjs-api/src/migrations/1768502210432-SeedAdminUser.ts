import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedAdminUser1768502210432 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO "roles" ("code", "name", "permissions") VALUES ('admin', 'Administrator', '[]');
            INSERT INTO "roles" ("code", "name", "permissions") VALUES ('user', 'User', '[]');
            INSERT INTO "users" ("username", "email", "password_hash", "full_name", "role_code", "is_active", "is_locked", "auth_source")
            VALUES ('admin', 'admin@example.com', '$2b$10$huuR5B56tGdrMfIC3Ea9uuMyGYu6ovvUlPjqZX06kmVJn5BTIFR1e', 'Admin User', 'admin', true, false, 'local');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "users" WHERE "username" = 'admin';
            DELETE FROM "roles" WHERE "code" IN ('admin', 'user');
        `);
    }

}
