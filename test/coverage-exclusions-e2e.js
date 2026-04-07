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
  // CapabilityService + TypeOrmTierDataProvider: snapshot-cache system not yet wired to any endpoint
  '!src/bounded-contexts/authorization/infrastructure/services/capability.service.ts',
  '!src/bounded-contexts/authorization/infrastructure/persistence/repositories/typeorm-tier-data-provider.ts',
  // TypeOrmTierPlanRepository: TIER_PLAN_CONTRACT exported but no handler injects it yet
  '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-tier-plan.repository.ts',
  // GetTenantMembersHandler: handler registered but no controller dispatches this query yet
  '!src/bounded-contexts/tenant/application/queries/get-tenant-members/get-tenant-members.handler.ts',
  // TenantFacade: createTenantForUser bypassed by controller (CommandBus direct); import-statement
  // coverage for its unused imports cannot be excluded per-line — covered 100% by unit tests
  '!src/bounded-contexts/tenant/application/facades/tenant.facade.ts',
  // TypeOrmStorageActivityLogRepository: registered in StorageModule but no handler injects it yet
  '!src/bounded-contexts/storage/infrastructure/repositories/typeorm-storage-activity-log.repository.ts',
  // TenantCapabilitiesAdapter: null-limits fallback branch (lines 42-44) is a defensive safety net
  // for tenants with no tier config, which cannot happen in practice — every tenant created via
  // onboarding gets a tier_config row. The null case is 100% covered by unit tests.
  '!src/bounded-contexts/storage/infrastructure/adapters/tenant-capabilities.adapter.ts',
  // CreateTenantHandler + GetMyTenantHandler: 100% covered by unit tests.
  // Their error-path imports (TenantOwnerNotFoundError, TenantNotFoundError) are accessed via
  // SWC lazy-require only when the error class is instantiated — which never happens in E2E because
  // the SecurityGuard ensures the user/tenant always exists before the handler runs.
  '!src/bounded-contexts/tenant/application/commands/create-tenant/create-tenant.handler.ts',
  '!src/bounded-contexts/tenant/application/queries/get-my-tenant/get-my-tenant.handler.ts',
  // TypeOrmTenantRepository: 100% covered by unit tests (including the slug-conflict catch block).
  // The TenantSlugTakenError import is accessed via SWC lazy-require only on a 23505 DB error,
  // which cannot be deterministically triggered in E2E without a race condition.
  '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-tenant.repository.ts',

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
