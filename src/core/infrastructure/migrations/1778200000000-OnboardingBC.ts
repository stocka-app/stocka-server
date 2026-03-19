import { MigrationInterface, QueryRunner } from 'typeorm';

export class OnboardingBC1778200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE onboarding_sessions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_uuid   VARCHAR(36) NOT NULL UNIQUE,
        path        VARCHAR(10) CHECK (path IN ('CREATE', 'JOIN')),
        current_step INT NOT NULL DEFAULT 0,
        step_data   JSONB NOT NULL DEFAULT '{}',
        invitation_code VARCHAR(128),
        status      VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_onboarding_sessions_user_uuid ON onboarding_sessions(user_uuid)
    `);

    await queryRunner.query(`
      CREATE TABLE tenant_invitations (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        tenant_uuid UUID NOT NULL,
        tenant_name VARCHAR(150) NOT NULL,
        invited_by  INT NOT NULL REFERENCES users(id),
        email       VARCHAR(255) NOT NULL,
        role        VARCHAR(30) NOT NULL,
        token       VARCHAR(128) UNIQUE NOT NULL,
        accepted_at TIMESTAMPTZ,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tenant_invitations_token ON tenant_invitations(token)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tenant_invitations_email ON tenant_invitations(email)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_tenant_invitations_pending
        ON tenant_invitations(tenant_id, email)
        WHERE accepted_at IS NULL AND expires_at > NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_invitations`);
    await queryRunner.query(`DROP TABLE IF EXISTS onboarding_sessions`);
  }
}
