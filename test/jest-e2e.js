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

    // ── TypeORM Entity decorators (metadata only, no business logic) ──────────
    '!src/**/infrastructure/persistence/entities/**',
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
  ],
  coverageDirectory: './coverage-e2e',
  coverageReporters: ['json', 'text', 'lcov', 'html'],
};
