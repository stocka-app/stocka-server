import { MigrationInterface, QueryRunner } from 'typeorm';

export class A03UserBCSuperAggregate1775000000000 implements MigrationInterface {
  name = 'A03UserBCSuperAggregate1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------------------------
    // process_state — saga process manager (unchanged)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "process_state" (
        "id"              uuid                     NOT NULL,
        "process_name"    character varying(100)   NOT NULL,
        "correlation_id"  character varying(255)   NOT NULL,
        "status"          character varying(20)    NOT NULL DEFAULT 'started',
        "current_step"    character varying(100)   NOT NULL,
        "data"            jsonb                    NOT NULL DEFAULT '{}',
        "error_message"   text,
        "started_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completed_at"    TIMESTAMP WITH TIME ZONE,
        "updated_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_process_state" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_process_state_process_name"     ON "process_state" ("process_name")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_process_state_correlation_id" ON "process_state" ("correlation_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_process_state_status"           ON "process_state" ("status")`);

    // -------------------------------------------------------------------------
    // users — anchor only (no domain fields)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"          SERIAL                   NOT NULL,
        "uuid"        uuid                     NOT NULL,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_users_uuid" UNIQUE ("uuid"),
        CONSTRAINT "PK_users"      PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // profiles — Profile Aggregate anchor (1:1 with users)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "profiles" (
        "id"          SERIAL                   NOT NULL,
        "uuid"        uuid                     NOT NULL,
        "user_id"     integer                  NOT NULL,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_profiles_uuid"    UNIQUE ("uuid"),
        CONSTRAINT "UQ_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_profiles"         PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // personal_profiles — username, display info, locale/timezone
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "personal_profiles" (
        "id"           SERIAL                   NOT NULL,
        "uuid"         uuid                     NOT NULL,
        "profile_id"   integer                  NOT NULL,
        "username"     character varying(30)    NOT NULL,
        "display_name" character varying(100),
        "avatar_url"   character varying(500),
        "locale"       character varying(10)    NOT NULL DEFAULT 'es',
        "timezone"     character varying(60)    NOT NULL DEFAULT 'America/Mexico_City',
        "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"  TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_personal_profiles_uuid"       UNIQUE ("uuid"),
        CONSTRAINT "UQ_personal_profiles_username"   UNIQUE ("username"),
        CONSTRAINT "UQ_personal_profiles_profile_id" UNIQUE ("profile_id"),
        CONSTRAINT "PK_personal_profiles"            PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // commercial_profiles — business identity (tax, phone, country)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "commercial_profiles" (
        "id"           SERIAL                   NOT NULL,
        "uuid"         uuid                     NOT NULL,
        "profile_id"   integer                  NOT NULL,
        "full_name"    character varying(150),
        "phone"        character varying(30),
        "country_code" character(2)             DEFAULT 'MX',
        "tax_id"       character varying(50),
        "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"  TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_commercial_profiles_uuid"       UNIQUE ("uuid"),
        CONSTRAINT "UQ_commercial_profiles_profile_id" UNIQUE ("profile_id"),
        CONSTRAINT "PK_commercial_profiles"            PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // social_profiles — OAuth display info (UUID ref cross-BC, no FK constraint)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "social_profiles" (
        "id"                    SERIAL                   NOT NULL,
        "uuid"                  uuid                     NOT NULL,
        "profile_id"            integer                  NOT NULL,
        "social_account_uuid"   uuid                     NOT NULL,
        "provider"              character varying(20)    NOT NULL,
        "provider_display_name" character varying(150),
        "provider_avatar_url"   character varying(500),
        "provider_profile_url"  character varying(500),
        "synced_at"             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"           TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_social_profiles_uuid"                    UNIQUE ("uuid"),
        CONSTRAINT "UQ_social_profiles_profile_id_provider"     UNIQUE ("profile_id", "provider"),
        CONSTRAINT "PK_social_profiles"                         PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // accounts — Account Aggregate anchor (1:1 with users)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id"          SERIAL                   NOT NULL,
        "uuid"        uuid                     NOT NULL,
        "user_id"     integer                  NOT NULL,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_accounts_uuid"    UNIQUE ("uuid"),
        CONSTRAINT "UQ_accounts_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_accounts"         PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // credential_accounts — email/password auth channel (1:1 with accounts)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "credential_accounts" (
        "id"                         SERIAL                   NOT NULL,
        "uuid"                       uuid                     NOT NULL,
        "account_id"                 integer                  NOT NULL,
        "email"                      character varying(255)   NOT NULL,
        "password_hash"              character varying(255),
        "status"                     character varying(30)    NOT NULL DEFAULT 'pending_verification',
        "email_verified_at"          TIMESTAMP WITH TIME ZONE,
        "verification_blocked_until" TIMESTAMP WITH TIME ZONE,
        "created_with"               character varying(20)    NOT NULL DEFAULT 'email',
        "created_at"                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"                TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_credential_accounts_uuid"       UNIQUE ("uuid"),
        CONSTRAINT "UQ_credential_accounts_email"      UNIQUE ("email"),
        CONSTRAINT "UQ_credential_accounts_account_id" UNIQUE ("account_id"),
        CONSTRAINT "PK_credential_accounts"            PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_credential_accounts_status"       ON "credential_accounts" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_credential_accounts_created_with" ON "credential_accounts" ("created_with")`);

    // -------------------------------------------------------------------------
    // social_accounts — OAuth auth channel (N:1 with accounts)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "social_accounts" (
        "id"             SERIAL                   NOT NULL,
        "uuid"           uuid                     NOT NULL,
        "account_id"     integer                  NOT NULL,
        "provider"       character varying(20)    NOT NULL,
        "provider_id"    character varying(255)   NOT NULL,
        "provider_email" character varying(255),
        "linked_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"    TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_social_accounts_uuid"               UNIQUE ("uuid"),
        CONSTRAINT "UQ_social_accounts_provider_id"        UNIQUE ("provider", "provider_id"),
        CONSTRAINT "UQ_social_accounts_account_provider"   UNIQUE ("account_id", "provider"),
        CONSTRAINT "PK_social_accounts"                    PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // sessions — Session anchor (N:1 with accounts)
    // archived_at used for sign-out soft delete / rollback
    // token_hash is UNIQUE for direct lookup without join
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id"          SERIAL                   NOT NULL,
        "uuid"        uuid                     NOT NULL,
        "account_id"  integer                  NOT NULL,
        "token_hash"  character varying(128)   NOT NULL,
        "expires_at"  TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_sessions_uuid"       UNIQUE ("uuid"),
        CONSTRAINT "UQ_sessions_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "PK_sessions"            PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // credential_sessions — links session → credential_account (1:1 per session)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "credential_sessions" (
        "id"                    SERIAL                   NOT NULL,
        "uuid"                  uuid                     NOT NULL,
        "session_id"            integer                  NOT NULL,
        "credential_account_id" integer                  NOT NULL,
        "created_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"           TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_credential_sessions_uuid"       UNIQUE ("uuid"),
        CONSTRAINT "UQ_credential_sessions_session_id" UNIQUE ("session_id"),
        CONSTRAINT "PK_credential_sessions"            PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // social_sessions — links session → social_account (1:1 per session)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "social_sessions" (
        "id"               SERIAL                   NOT NULL,
        "uuid"             uuid                     NOT NULL,
        "session_id"       integer                  NOT NULL,
        "social_account_id" integer                 NOT NULL,
        "provider"         character varying(20)    NOT NULL,
        "created_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"      TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_social_sessions_uuid"       UNIQUE ("uuid"),
        CONSTRAINT "UQ_social_sessions_session_id" UNIQUE ("session_id"),
        CONSTRAINT "PK_social_sessions"            PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // verification_attempts — rate limiting audit (user_uuid is UUID ref, no FK)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "verification_attempts" (
        "id"                SERIAL                   NOT NULL,
        "uuid"              uuid                     NOT NULL,
        "created_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"       TIMESTAMP WITH TIME ZONE,
        "user_uuid"         character varying(36),
        "email"             character varying(255),
        "ip_address"        inet                     NOT NULL,
        "user_agent"        text,
        "code_entered"      character varying(10),
        "success"           boolean                  NOT NULL DEFAULT false,
        "verification_type" character varying(30)    NOT NULL DEFAULT 'email_verification',
        "attempted_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_verification_attempts_uuid" UNIQUE ("uuid"),
        CONSTRAINT "PK_verification_attempts"      PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_verification_attempts_user_uuid"    ON "verification_attempts" ("user_uuid")`);
    await queryRunner.query(`CREATE INDEX "IDX_verification_attempts_email"        ON "verification_attempts" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_verification_attempts_ip_address"   ON "verification_attempts" ("ip_address")`);
    await queryRunner.query(`CREATE INDEX "IDX_verification_attempts_attempted_at" ON "verification_attempts" ("attempted_at")`);

    // -------------------------------------------------------------------------
    // email_verification_tokens — FK to credential_accounts (not users)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "email_verification_tokens" (
        "id"                    SERIAL                   NOT NULL,
        "uuid"                  uuid                     NOT NULL,
        "created_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"           TIMESTAMP WITH TIME ZONE,
        "credential_account_id" integer                  NOT NULL,
        "code_hash"             character varying(128)   NOT NULL,
        "expires_at"            TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at"               TIMESTAMP WITH TIME ZONE,
        "resend_count"          integer                  NOT NULL DEFAULT 0,
        "last_resent_at"        TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_email_verification_tokens_uuid" UNIQUE ("uuid"),
        CONSTRAINT "PK_email_verification_tokens"      PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_email_verification_tokens_credential_account_id" ON "email_verification_tokens" ("credential_account_id")`);

    // -------------------------------------------------------------------------
    // password_reset_tokens — FK to credential_accounts (not users)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id"                    SERIAL                   NOT NULL,
        "uuid"                  uuid                     NOT NULL,
        "created_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"           TIMESTAMP WITH TIME ZONE,
        "credential_account_id" integer                  NOT NULL,
        "token_hash"            character varying(128)   NOT NULL,
        "expires_at"            TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at"               TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_password_reset_tokens_uuid" UNIQUE ("uuid"),
        CONSTRAINT "PK_password_reset_tokens"      PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_password_reset_tokens_token_hash" ON "password_reset_tokens" ("token_hash")`);

    // =========================================================================
    // Foreign Key Constraints
    // Order: child tables reference parent tables — all parents must exist first
    // =========================================================================

    // profiles → users
    await queryRunner.query(`
      ALTER TABLE "profiles"
        ADD CONSTRAINT "FK_profiles_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // personal_profiles → profiles
    await queryRunner.query(`
      ALTER TABLE "personal_profiles"
        ADD CONSTRAINT "FK_personal_profiles_profile_id"
        FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // commercial_profiles → profiles
    await queryRunner.query(`
      ALTER TABLE "commercial_profiles"
        ADD CONSTRAINT "FK_commercial_profiles_profile_id"
        FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // social_profiles → profiles (no FK on social_account_uuid — cross-BC ref)
    await queryRunner.query(`
      ALTER TABLE "social_profiles"
        ADD CONSTRAINT "FK_social_profiles_profile_id"
        FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // accounts → users
    await queryRunner.query(`
      ALTER TABLE "accounts"
        ADD CONSTRAINT "FK_accounts_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // credential_accounts → accounts
    await queryRunner.query(`
      ALTER TABLE "credential_accounts"
        ADD CONSTRAINT "FK_credential_accounts_account_id"
        FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // social_accounts → accounts
    await queryRunner.query(`
      ALTER TABLE "social_accounts"
        ADD CONSTRAINT "FK_social_accounts_account_id"
        FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // sessions → accounts
    await queryRunner.query(`
      ALTER TABLE "sessions"
        ADD CONSTRAINT "FK_sessions_account_id"
        FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // credential_sessions → sessions + credential_accounts
    await queryRunner.query(`
      ALTER TABLE "credential_sessions"
        ADD CONSTRAINT "FK_credential_sessions_session_id"
        FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "credential_sessions"
        ADD CONSTRAINT "FK_credential_sessions_credential_account_id"
        FOREIGN KEY ("credential_account_id") REFERENCES "credential_accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    // social_sessions → sessions + social_accounts
    await queryRunner.query(`
      ALTER TABLE "social_sessions"
        ADD CONSTRAINT "FK_social_sessions_session_id"
        FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "social_sessions"
        ADD CONSTRAINT "FK_social_sessions_social_account_id"
        FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    // email_verification_tokens → credential_accounts
    await queryRunner.query(`
      ALTER TABLE "email_verification_tokens"
        ADD CONSTRAINT "FK_email_verification_tokens_credential_account_id"
        FOREIGN KEY ("credential_account_id") REFERENCES "credential_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // password_reset_tokens → credential_accounts
    await queryRunner.query(`
      ALTER TABLE "password_reset_tokens"
        ADD CONSTRAINT "FK_password_reset_tokens_credential_account_id"
        FOREIGN KEY ("credential_account_id") REFERENCES "credential_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraints first (reverse order of creation)
    await queryRunner.query(`ALTER TABLE "password_reset_tokens"      DROP CONSTRAINT "FK_password_reset_tokens_credential_account_id"`);
    await queryRunner.query(`ALTER TABLE "email_verification_tokens"  DROP CONSTRAINT "FK_email_verification_tokens_credential_account_id"`);
    await queryRunner.query(`ALTER TABLE "social_sessions"            DROP CONSTRAINT "FK_social_sessions_social_account_id"`);
    await queryRunner.query(`ALTER TABLE "social_sessions"            DROP CONSTRAINT "FK_social_sessions_session_id"`);
    await queryRunner.query(`ALTER TABLE "credential_sessions"        DROP CONSTRAINT "FK_credential_sessions_credential_account_id"`);
    await queryRunner.query(`ALTER TABLE "credential_sessions"        DROP CONSTRAINT "FK_credential_sessions_session_id"`);
    await queryRunner.query(`ALTER TABLE "sessions"                   DROP CONSTRAINT "FK_sessions_account_id"`);
    await queryRunner.query(`ALTER TABLE "social_accounts"            DROP CONSTRAINT "FK_social_accounts_account_id"`);
    await queryRunner.query(`ALTER TABLE "credential_accounts"        DROP CONSTRAINT "FK_credential_accounts_account_id"`);
    await queryRunner.query(`ALTER TABLE "accounts"                   DROP CONSTRAINT "FK_accounts_user_id"`);
    await queryRunner.query(`ALTER TABLE "social_profiles"            DROP CONSTRAINT "FK_social_profiles_profile_id"`);
    await queryRunner.query(`ALTER TABLE "commercial_profiles"        DROP CONSTRAINT "FK_commercial_profiles_profile_id"`);
    await queryRunner.query(`ALTER TABLE "personal_profiles"          DROP CONSTRAINT "FK_personal_profiles_profile_id"`);
    await queryRunner.query(`ALTER TABLE "profiles"                   DROP CONSTRAINT "FK_profiles_user_id"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_tokens_token_hash"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_email_verification_tokens_credential_account_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_verification_attempts_attempted_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_verification_attempts_ip_address"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_verification_attempts_email"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_verification_attempts_user_uuid"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_credential_accounts_created_with"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_credential_accounts_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_process_state_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_process_state_correlation_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_process_state_process_name"`);

    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE "email_verification_tokens"`);
    await queryRunner.query(`DROP TABLE "verification_attempts"`);
    await queryRunner.query(`DROP TABLE "social_sessions"`);
    await queryRunner.query(`DROP TABLE "credential_sessions"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "social_accounts"`);
    await queryRunner.query(`DROP TABLE "credential_accounts"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TABLE "social_profiles"`);
    await queryRunner.query(`DROP TABLE "commercial_profiles"`);
    await queryRunner.query(`DROP TABLE "personal_profiles"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "process_state"`);
  }
}
