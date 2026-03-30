/**
 * E2E-test coverage exclusions.
 *
 * E2E tests cover the infrastructure and application layers that require a real
 * NestJS DI container and a real PostgreSQL database: controllers, repositories,
 * facades, sagas, command/query handlers, adapters, and database utilities.
 *
 * Exclusion policy:
 *   - KEEP base exclusions shared with unit tests (boilerplate, bootstrap,
 *     schema/DDL, external services, future features).
 *   - EXCLUDE domain and common layers — these are already at 100% via unit tests
 *     and should not inflate or dilute the E2E coverage report.
 *   - EXCLUDE shared infrastructure utilities already covered by unit tests.
 *   - EXCLUDE infrastructure mappers, guards, and helpers covered by unit tests.
 *   - EXCLUDE application event-handlers covered by unit tests.
 *   - INCLUDE everything that needs real DI + DB (controllers, repos, facades,
 *     sagas, handlers, adapters, database infra, capability service).
 *
 * Categories:
 *   BOILERPLATE       — NestJS DI wiring, barrel re-exports, type declarations
 *   BOOTSTRAP         — App entry point and environment configuration
 *   SCHEMA/DDL        — Database migrations, seeds, TypeORM entity decorators
 *   EXTERNAL          — Code that requires a real external service (OAuth, email)
 *   UNIT-COVERED      — Domain, common, and shared infra already tested by unit tests
 *   FUTURE            — Wired but not yet exercised features
 */
module.exports = [
  // ── Include all src ──────────────────────────────────────────────────────
  'src/**/*.(t|j)s',

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE EXCLUSIONS (shared with unit config)
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ── CQRS DTOs (command/query classes — pure data carriers, no logic) ─────
  '!src/**/application/commands/**/*.command.ts',
  '!src/**/application/queries/**/*.query.ts',

  // ── WIRED BUT NOT YET EXERCISED (future features with active imports) ────
  '!src/bounded-contexts/user/profile/domain/models/commercial-profile.model.ts',
  '!src/bounded-contexts/user/profile/infrastructure/mappers/commercial-profile.mapper.ts',
  '!src/bounded-contexts/user/account/session/domain/session.aggregate.ts',
  '!src/bounded-contexts/user/account/session/infrastructure/mappers/session.mapper.ts',
  '!src/bounded-contexts/user/account/session/infrastructure/repositories/typeorm-session.repository.ts',

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT-COVERED: Domain layer (100% covered by unit tests)
  // ═══════════════════════════════════════════════════════════════════════════

  // All domain models, value objects, events, exceptions, services, aggregates
  '!src/**/domain/**',
  // Shared domain (shared value objects, contracts, exceptions)
  '!src/shared/domain/**',

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT-COVERED: Common layer (guards, filters, interceptors, pipes, decorators)
  // ═══════════════════════════════════════════════════════════════════════════

  '!src/common/**',

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT-COVERED: Shared infrastructure utilities
  // ═══════════════════════════════════════════════════════════════════════════

  // Email exceptions (domain-level errors, no external calls)
  '!src/shared/infrastructure/email/exceptions/**',
  // HTTP domain-error-mapper (pure mapping logic)
  '!src/shared/infrastructure/http/**',
  // i18n locale helper (pure utility)
  '!src/shared/infrastructure/i18n/**',
  // Transform interceptor (pure response transformation)
  '!src/shared/infrastructure/interceptors/**',
  // Mediator service (in-process bus, tested via unit)
  '!src/shared/infrastructure/mediator/**',
  // RBAC boot validator (startup validation logic)
  '!src/bounded-contexts/authorization/infrastructure/services/rbac-boot-validator.ts',
  // Process manager (orchestration logic, unit-tested)
  '!src/shared/infrastructure/process-manager/**',
  // Crypto service (pure utility)
  '!src/shared/infrastructure/services/**',

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT-COVERED: Infrastructure mappers (pure data transformation)
  // ═══════════════════════════════════════════════════════════════════════════

  '!src/**/infrastructure/mappers/**',
  '!src/**/infrastructure/persistence/mappers/**',

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT-COVERED: Infrastructure guards and helpers
  // ═══════════════════════════════════════════════════════════════════════════

  '!src/**/infrastructure/guards/**',
  '!src/**/infrastructure/helpers/**',

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT-COVERED: Application event handlers
  // ═══════════════════════════════════════════════════════════════════════════

  '!src/**/application/event-handlers/**',

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT-COVERED: Application-level domain errors (same pattern as domain exceptions)
  // ═══════════════════════════════════════════════════════════════════════════

  '!src/**/application/errors/**',

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT-COVERED: Core config and infrastructure already tested
  // ═══════════════════════════════════════════════════════════════════════════

  // Environment validation (pure Joi schema — unit tested)
  '!src/core/config/environment/**',
  // Health controller (unit tested)
  '!src/core/infrastructure/health/**',
];
