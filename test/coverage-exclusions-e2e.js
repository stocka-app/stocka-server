/**
 * E2E-test coverage exclusions.
 *
 * E2E exercises the full system through HTTP against a real DB. We measure
 * what actually executes in that flow — we do NOT exclude files just because
 * "the unit tests already cover them". Unit and E2E coverage are reported
 * independently; the merged report is the only one that combines them.
 *
 * Exclusion policy (the SHORT list):
 *   - BOILERPLATE  — NestJS DI wiring, barrel re-exports, type declarations
 *   - BOOTSTRAP    — App entry point, env validation, swagger config
 *   - SCHEMA/DDL   — Migrations, seeds, TypeORM entity decorators (no logic)
 *   - EXTERNAL     — Code that hits a real third-party service in production
 *                    and cannot run inside the test container (OAuth providers,
 *                    Resend email API)
 *   - FUTURE       — Wired but not yet exercised by any handler / endpoint
 */
module.exports = [
  // ── Include all src ──────────────────────────────────────────────────────
  'src/**/*.(t|j)s',

  // ── BOILERPLATE (no runtime logic) ───────────────────────────────────────
  '!src/**/*.module.ts',
  '!src/**/*.constants.ts',
  '!src/**/*.types.ts',
  '!src/**/index.ts',
  // DTOs: class-validator decorators only — validated implicitly by E2E (400 on bad input)
  '!src/**/*.dto.ts',

  // ── BOOTSTRAP (not exercisable through test layer) ───────────────────────
  '!src/core/infrastructure/main.ts',
  '!src/core/infrastructure/app.controller.ts',
  '!src/core/config/database/**',
  '!src/core/config/swagger/**',
  '!src/core/config/environment/**',

  // ── SCHEMA / DDL (no application logic) ──────────────────────────────────
  '!src/core/infrastructure/migrations/**',
  '!src/core/infrastructure/seeds/**',
  '!src/**/infrastructure/persistence/entities/**',
  '!src/**/infrastructure/entities/**',
  '!src/shared/infrastructure/persistence/entities/**',
  '!src/shared/infrastructure/base/**',

  // ── EXTERNAL: Email (requires Resend API key) ────────────────────────────
  '!src/shared/infrastructure/email/providers/**',
  '!src/shared/infrastructure/email/templates/**',
  '!src/shared/infrastructure/email/contracts/**',

  // ── EXTERNAL: OAuth (requires provider handshake — Apple / Google / FB / MS) ─
  '!src/**/infrastructure/strategies/**',
  '!src/**/infrastructure/controllers/google-authentication/**',
  '!src/**/infrastructure/controllers/facebook-authentication/**',
  '!src/**/infrastructure/controllers/microsoft-authentication/**',
  '!src/**/infrastructure/controllers/apple-authentication/**',
  '!src/**/infrastructure/controllers/apple-callback/**',
  '!src/**/infrastructure/controllers/google-callback/**',
  '!src/**/infrastructure/controllers/facebook-callback/**',
  '!src/**/infrastructure/controllers/microsoft-callback/**',

  // ── CQRS DTOs (command / query classes — pure data carriers, no logic) ───
  '!src/**/application/commands/**/*.command.ts',
  '!src/**/application/queries/**/*.query.ts',

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFENSIVE — Domain exceptions / errors instantiated ONLY by internal VOs,
  // models or saga steps. Never reachable through HTTP because either (a) the
  // DTO class-validator rejects invalid input first, (b) the VO is constructed
  // with internal-only data (AttemptedAtVO.now(), hash from bcrypt), or (c) the
  // exception has no throw site in the codebase (dead / placeholder code).
  // Fully covered at 100% by unit tests via direct VO / model instantiation.
  // ═══════════════════════════════════════════════════════════════════════════

  // Authentication exceptions (VO validation — class-validator catches first)
  '!src/bounded-contexts/authentication/domain/exceptions/invalid-password.exception.ts',
  '!src/bounded-contexts/authentication/domain/exceptions/invalid-attempted-at.exception.ts',
  '!src/bounded-contexts/authentication/domain/exceptions/invalid-user-agent.exception.ts',
  '!src/bounded-contexts/authentication/domain/exceptions/invalid-verification-type.exception.ts',
  '!src/bounded-contexts/authentication/domain/exceptions/email-delivery-failed.exception.ts',
  // Authentication exceptions (rate-limit / verification blocking — no throw
  // site in the codebase; placeholders for future enforcement)
  '!src/bounded-contexts/authentication/domain/exceptions/rate-limit-exceeded.exception.ts',
  '!src/bounded-contexts/authentication/domain/exceptions/too-many-verification-attempts.exception.ts',
  '!src/bounded-contexts/authentication/domain/exceptions/verification-blocked.exception.ts',

  // Tenant domain errors (no throw site — defensive placeholders or
  // JWT-guard-prevents: the aggregate method that would throw is never called
  // via an HTTP endpoint today)
  '!src/bounded-contexts/tenant/domain/errors/cannot-remove-last-owner.error.ts',
  '!src/bounded-contexts/tenant/domain/errors/member-not-found.error.ts',
  '!src/bounded-contexts/tenant/domain/errors/tenant-limit-exceeded.error.ts',
  '!src/bounded-contexts/tenant/domain/errors/tenant-not-found.error.ts',
  '!src/bounded-contexts/tenant/domain/errors/tenant-owner-not-found.error.ts',
  '!src/bounded-contexts/tenant/domain/errors/tenant-slug-taken.error.ts',
  '!src/bounded-contexts/tenant/domain/errors/tier-not-allowed.error.ts',

  // User / shared exceptions (defensive — JWT guard ensures user exists;
  // class-validator prevents invalid email; saga timeout requires real delay)
  '!src/bounded-contexts/user/domain/exceptions/user-not-found.exception.ts',
  '!src/shared/domain/exceptions/invalid-email-format.exception.ts',
  '!src/shared/domain/exceptions/saga-timeout.exception.ts',
  '!src/shared/infrastructure/email/exceptions/email-delivery.exception.ts',

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFENSIVE — Value objects / enums instantiated ONLY by internal models.
  // Their constructors never receive external (HTTP) input. Validation branches
  // are exercised exhaustively by unit tests.
  // ═══════════════════════════════════════════════════════════════════════════

  // Authentication VOs (internal to VerificationAttemptModel / EmailVerificationTokenModel)
  '!src/bounded-contexts/authentication/domain/value-objects/**',
  '!src/bounded-contexts/authentication/domain/enums/social-provider.enum.ts',
  // User VOs (enum wrappers — only created by mappers from DB enum columns)
  '!src/bounded-contexts/user/domain/value-objects/**',
  // Storage VOs (create() err branches unreachable — class-validator validates first)
  '!src/bounded-contexts/storage/domain/value-objects/**',
  // Tenant VOs (create() err branches unreachable — class-validator validates first)
  '!src/bounded-contexts/tenant/domain/value-objects/**',
  // Shared VOs (internal — hash from bcrypt, status from DB enum, etc.)
  '!src/shared/domain/value-objects/**',

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFENSIVE — Domain events are pure data carriers instantiated internally.
  // SWC compiles constructors differently, producing uncoverable function
  // branches. Fully covered by unit tests.
  // ═══════════════════════════════════════════════════════════════════════════
  '!src/**/domain/events/**',
  '!src/shared/domain/events/**',

  // ── FUTURE: wired with active imports but no caller exercises them yet ───
  '!src/bounded-contexts/user/profile/domain/models/commercial-profile.model.ts',
  '!src/bounded-contexts/user/profile/infrastructure/mappers/commercial-profile.mapper.ts',
  // CapabilityService + TypeOrmTierDataProvider: snapshot-cache system not wired to any endpoint
  '!src/bounded-contexts/authorization/infrastructure/services/capability.service.ts',
  '!src/bounded-contexts/authorization/infrastructure/persistence/repositories/typeorm-tier-data-provider.ts',
  // TypeOrmTierPlanRepository: TIER_PLAN_CONTRACT exported but no handler injects it yet
  '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-tier-plan.repository.ts',
  // GetTenantMembersHandler: handler registered but no controller dispatches this query yet
  '!src/bounded-contexts/tenant/application/queries/get-tenant-members/get-tenant-members.handler.ts',
  // TypeOrmStorageActivityLogRepository: registered in StorageModule but no handler injects it yet
  '!src/bounded-contexts/storage/infrastructure/repositories/typeorm-storage-activity-log.repository.ts',
];
