module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  rootDir: '..',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  globalSetup: '<rootDir>/test/global-setup.js',
  testTimeout: 120000,
  // Load .env.test before any module is evaluated in each worker process.
  // Required for module-level reads like APP_CONSTANTS.BCRYPT_SALT_ROUNDS.
  setupFiles: ['<rootDir>/test/setup-env.js'],
  // Number of parallel workers. Mirrors E2E_WORKERS env var; defaults to 4.
  // With --runInBand (test:e2e:seq / test:e2e:cov) this has no effect.
  maxWorkers: parseInt(process.env.E2E_WORKERS || '4', 10),
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!uuid)/'],
  moduleNameMapper: {
    '^@storage/(.*)$': '<rootDir>/src/bounded-contexts/storage/$1',
    '^@onboarding/(.*)$': '<rootDir>/src/bounded-contexts/onboarding/$1',
    '^@tenant/(.*)$': '<rootDir>/src/bounded-contexts/tenant/$1',
    '^@authentication/(.*)$': '<rootDir>/src/bounded-contexts/authentication/$1',
    '^@user/(.*)$': '<rootDir>/src/bounded-contexts/user/$1',
    '^@test-mockup/(.*)$': '<rootDir>/test/__mocks__/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  collectCoverageFrom: [
    // ── Include all src (domain + application + infrastructure + common) ──────
    'src/**/*.(t|j)s',

    // ── NestJS boilerplate (DI wiring, no business logic) ─────────────────────
    '!src/**/*.module.ts',
    // ── DTOs (class-validator decorators only, no runtime logic) ──────────────
    '!src/**/*.dto.ts',
    // ── Constants and type-only files (no runtime code) ───────────────────────
    '!src/**/*.constants.ts',
    '!src/**/*.types.ts',
    // ── Barrel re-exports (no logic) ──────────────────────────────────────────
    '!src/**/index.ts',

    // ── Bootstrap entry point (not exercised through e2e HTTP layer) ──────────
    '!src/core/infrastructure/main.ts',
    // ── DB / Swagger / env config objects (no business logic) ─────────────────
    '!src/core/config/**',
    // ── SQL Migrations (DDL scripts, no application logic) ────────────────────
    '!src/core/infrastructure/migrations/**',
    '!src/core/infrastructure/seeds/**',

    // ── TypeORM Entity decorators (metadata only, no business logic) ──────────
    '!src/**/infrastructure/persistence/entities/**',
    '!src/**/infrastructure/entities/**',
    '!src/shared/infrastructure/persistence/entities/**',
    '!src/shared/infrastructure/base/**',

    // ── Email provider (requires a real Resend API key; mocked in e2e) ────────
    '!src/shared/infrastructure/email/providers/**',
    // ── Email HTML templates (static strings, no logic) ───────────────────────
    '!src/shared/infrastructure/email/templates/**',
    // ── Email provider contract (TypeScript interface, no runtime code) ────────
    '!src/shared/infrastructure/email/contracts/**',

    // ── Passport OAuth strategies (require external OAuth provider handshake) ──
    '!src/**/infrastructure/strategies/**',

    // ── OAuth redirect-only controllers (no business logic, guard-driven) ──────
    '!src/**/infrastructure/controllers/google-authentication/**',
    '!src/**/infrastructure/controllers/facebook-authentication/**',
    '!src/**/infrastructure/controllers/microsoft-authentication/**',
    '!src/**/infrastructure/controllers/apple-authentication/**',
    // ── OAuth callback controllers (require OAuth provider response payload) ───
    '!src/**/infrastructure/controllers/apple-callback/**',
    '!src/**/infrastructure/controllers/google-callback/**',
    '!src/**/infrastructure/controllers/facebook-callback/**',
    '!src/**/infrastructure/controllers/microsoft-callback/**',

    // ── Legacy BC (pre-refactor stub, removed from active codebase) ───────────
    '!src/bounded-contexts/auth/**',

    // ── ProcessStateRepository (not wired in any NestJS module; no DI path) ───
    '!src/shared/infrastructure/persistence/repositories/typeorm-process-state.repository.ts',

    // ── Dead/orphaned exception (no longer referenced in any saga or handler) ────────
    '!src/bounded-contexts/authentication/domain/exceptions/social-account-required.exception.ts',

    // ── Future-feature scaffolding (not yet wired to any saga, handler, or module) ─
    '!src/bounded-contexts/user/account/session/domain/session.aggregate.ts',
    '!src/bounded-contexts/user/account/session/infrastructure/mappers/session.mapper.ts',
    '!src/bounded-contexts/user/account/session/infrastructure/repositories/typeorm-session.repository.ts',
    '!src/bounded-contexts/user/domain/events/account-became-flexible.event.ts',
    '!src/bounded-contexts/user/domain/events/provider-linked.event.ts',
    '!src/bounded-contexts/user/profile/domain/models/commercial-profile.model.ts',
    '!src/bounded-contexts/user/profile/infrastructure/mappers/commercial-profile.mapper.ts',
    // ── @deprecated social account repo (superseded; no active DI binding) ────────
    '!src/bounded-contexts/user/infrastructure/persistence/repositories/typeorm-social-account.repository.ts',
    // ── User consent repository (not wired in any NestJS module; no DI path) ────
    '!src/bounded-contexts/user/infrastructure/persistence/repositories/typeorm-user-consent.repository.ts',

    // ── Tenant infrastructure ─────────────────────────────────────────────────
    // Tier-plan and tier-data-provider not exercised by any e2e flow — excluded.
    '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-tier-plan.repository.ts',
    '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-tier-data-provider.ts',
    // Entity repositories excluded — covered by unit tests via mocks; e2e focuses on controllers.
    '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-tenant.repository.ts',
    '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-tenant-config.repository.ts',
    '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-tenant-member.repository.ts',
    '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-tenant-profile.repository.ts',
    // RBAC policy adapter excluded — TypeORM data-access layer with in-memory cache;
    // cache expiry branches (TTL 10–30 min) are not exercisable in automated e2e runs.
    '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-rbac-policy.adapter.ts',
    // All tenant controllers (including rbac) are exercised by invitation.e2e-spec.ts and rbac.e2e-spec.ts.

    // ── Storage infrastructure (no storage e2e suite yet) ────────────────────
    '!src/bounded-contexts/storage/infrastructure/repositories/typeorm-storage.repository.ts',
    '!src/bounded-contexts/storage/infrastructure/adapters/tenant-capabilities.adapter.ts',
    '!src/bounded-contexts/storage/infrastructure/http/controllers/**',

    // ── Onboarding infrastructure (no onboarding e2e suite yet) ─────────────
    '!src/bounded-contexts/onboarding/infrastructure/repositories/**',
    '!src/bounded-contexts/onboarding/infrastructure/http/controllers/**',
    '!src/bounded-contexts/onboarding/infrastructure/mappers/**',
    '!src/bounded-contexts/onboarding/infrastructure/entities/**',
  ],
  coverageDirectory: './coverage-e2e',
  coverageReporters: ['json', 'text', 'lcov', 'html'],
};
