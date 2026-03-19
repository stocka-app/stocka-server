import { MigrationInterface, QueryRunner } from 'typeorm';

export class StorageBC1778000000000 implements MigrationInterface {
  name = 'StorageBC1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Anchor table: storages ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE storages (
        id          SERIAL       PRIMARY KEY,
        uuid        UUID         NOT NULL UNIQUE,
        tenant_uuid UUID         NOT NULL,
        type        VARCHAR(20)  NOT NULL CHECK (type IN ('CUSTOM_ROOM', 'STORE_ROOM', 'WAREHOUSE')),
        name        VARCHAR(100) NOT NULL,
        archived_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_storage_active_name_per_tenant
        ON storages (tenant_uuid, LOWER(name))
        WHERE archived_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_storages_tenant_uuid
        ON storages (tenant_uuid)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_storages_tenant_type
        ON storages (tenant_uuid, type)
        WHERE archived_at IS NULL
    `);

    // ── Sub-table: custom_rooms ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE custom_rooms (
        id         SERIAL      PRIMARY KEY,
        uuid       UUID        NOT NULL UNIQUE,
        storage_id INTEGER     NOT NULL REFERENCES storages(id) ON DELETE CASCADE,
        room_type  VARCHAR(50) NOT NULL,
        address    TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── Sub-table: store_rooms ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE store_rooms (
        id         SERIAL      PRIMARY KEY,
        uuid       UUID        NOT NULL UNIQUE,
        storage_id INTEGER     NOT NULL REFERENCES storages(id) ON DELETE CASCADE,
        address    TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── Sub-table: warehouses ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE warehouses (
        id         SERIAL      PRIMARY KEY,
        uuid       UUID        NOT NULL UNIQUE,
        storage_id INTEGER     NOT NULL REFERENCES storages(id) ON DELETE CASCADE,
        address    TEXT        NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── Alter tenant_config: add max_custom_rooms and max_store_rooms ──
    await queryRunner.query(`
      ALTER TABLE tenant_config
        ADD COLUMN max_custom_rooms INTEGER NOT NULL DEFAULT 1
    `);

    await queryRunner.query(`
      ALTER TABLE tenant_config
        ADD COLUMN max_store_rooms INTEGER NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenant_config DROP COLUMN max_store_rooms`);
    await queryRunner.query(`ALTER TABLE tenant_config DROP COLUMN max_custom_rooms`);
    await queryRunner.query(`DROP TABLE IF EXISTS warehouses`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_rooms`);
    await queryRunner.query(`DROP TABLE IF EXISTS custom_rooms`);
    await queryRunner.query(`DROP TABLE IF EXISTS storages`);
  }
}
