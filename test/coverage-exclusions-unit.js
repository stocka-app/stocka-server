/**
 * Unit-test coverage exclusions.
 *
 * Unit tests cover pure domain logic: value objects, aggregates, models,
 * exceptions, mappers, validators, guards, helpers, and event handlers.
 *
 * Exclusion policy: only exclude files with ZERO runtime business logic
 * or files that require a real DI container / database (covered by E2E).
 *
 * Categories:
 *   BOILERPLATE  — NestJS DI wiring, barrel re-exports, type declarations
 *   BOOTSTRAP    — App entry point and environment configuration
 *   SCHEMA/DDL   — Database migrations, seeds, TypeORM entity decorators
 *   EXTERNAL     — Code that requires a real external service (OAuth provider, email API)
 *   E2E-ONLY     — Infrastructure and application layers needing real DB / DI container
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

  // ── EXTERNAL: OAuth (requires provider handshake) ────────────────────────
  '!src/**/infrastructure/strategies/**',
  '!src/**/infrastructure/controllers/google-authentication/**',
  '!src/**/infrastructure/controllers/facebook-authentication/**',
  '!src/**/infrastructure/controllers/microsoft-authentication/**',
  '!src/**/infrastructure/controllers/apple-authentication/**',
  '!src/**/infrastructure/controllers/apple-callback/**',
  '!src/**/infrastructure/controllers/google-callback/**',
  '!src/**/infrastructure/controllers/facebook-callback/**',
  '!src/**/infrastructure/controllers/microsoft-callback/**',

  // ── E2E-ONLY: Infrastructure controllers (HTTP layer) ─────────────────────
  // Controllers delegate to CommandBus/QueryBus, need real DI container + DB.
  // Covered by E2E specs (sign-up, sign-in, onboarding, storage-crud, etc.).
  // NOTE: OAuth controllers already excluded above under EXTERNAL.
  // NOTE: health.controller has a unit test — excluded from this glob via path.
  '!src/**/infrastructure/controllers/**/*.controller.ts',
  '!src/**/infrastructure/http/controllers/**/*.controller.ts',

  // ── E2E-ONLY: Infrastructure repositories (TypeORM persistence) ──────────
  // These ARE the contract implementations — TypeORM queries against real DB.
  // Covered by E2E infra-repository spec + feature E2E specs.
  '!src/**/infrastructure/repositories/**',
  '!src/**/infrastructure/persistence/repositories/**',

  // ── E2E-ONLY: Application facades (cross-BC orchestration via contracts) ──
  // Facades inject contracts backed by TypeORM repos; need real DB.
  // onboarding.facade, tenant.facade — exercised by onboarding + tenant E2E.
  '!src/**/application/facades/**',

  // ── E2E-ONLY: Application sagas + saga steps (multi-step DB workflows) ────
  // Sagas orchestrate repos, contracts, EventPublisher — need full DI + DB.
  // sign-up, sign-in, reset-password, refresh-session, social-sign-in sagas.
  // saga-context files are pure data holders but tightly coupled to saga execution.
  '!src/**/application/sagas/**',

  // ── E2E-ONLY: Application command/query handlers (inject contracts/repos) ─
  // Per project philosophy: internal contracts are never mocked.
  // Every handler injects at least one contract backed by TypeORM → needs real DB.
  // Covered by feature-level E2E specs (sign-up, storage-crud, invitation, etc.).
  '!src/**/application/commands/**/*.handler.ts',
  '!src/**/application/queries/**/*.handler.ts',

  // ── CQRS DTOs (command/query classes — pure data carriers, no logic) ─────
  '!src/**/application/commands/**/*.command.ts',
  '!src/**/application/queries/**/*.query.ts',

  // ── E2E-ONLY: Infrastructure adapters (raw SQL / DataSource) ─────────────
  '!src/**/infrastructure/adapters/**',

  // ── E2E-ONLY: Infrastructure facades (inject contracts backed by repos) ──
  '!src/**/infrastructure/facade/**',

  // ── E2E-ONLY: Shared infrastructure database (UoW, ALS middleware) ────────
  // TypeOrmUnitOfWork needs real DataSource + QueryRunner.
  // UoW isolation middleware needs real ALS + request lifecycle.
  '!src/shared/infrastructure/database/typeorm-unit-of-work.ts',
  '!src/shared/infrastructure/database/unit-of-work-isolation.middleware.ts',

  // ── E2E-ONLY: Capability service (injects TierDataProvider + RbacPolicyPort) ─
  // Both ports are backed by TypeORM repos; needs real DB to resolve capabilities.
  // Covered by get-tenant-capabilities E2E spec.
  '!src/bounded-contexts/authorization/infrastructure/services/capability.service.ts',

  // ── WIRED BUT NOT YET EXERCISED (future features with active imports) ────
  // commercial-profile model/mapper: imported by profile.contract + typeorm-profile.repository
  // session aggregate/mapper/repo: wired in session.module + authentication.module
  // These stay excluded until their feature is built; they have no callers today.
  '!src/bounded-contexts/user/profile/domain/models/commercial-profile.model.ts',
  '!src/bounded-contexts/user/profile/infrastructure/mappers/commercial-profile.mapper.ts',
  '!src/bounded-contexts/user/account/session/domain/session.aggregate.ts',
  '!src/bounded-contexts/user/account/session/infrastructure/mappers/session.mapper.ts',
  '!src/bounded-contexts/user/account/session/infrastructure/repositories/typeorm-session.repository.ts',
];
