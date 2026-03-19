module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    // ── Include all src ──────────────────────────────────────────────────
    'src/**/*.(t|j)s',

    // ── BC legacy (pre-refactor, removed) ─────────────────────────────────
    '!src/bounded-contexts/auth/**',

    // ── NestJS boilerplate (no business logic) ────────────────────────────
    '!src/**/*.module.ts',
    '!src/**/*.constants.ts',
    '!src/**/*.types.ts',
    '!src/**/index.ts',

    // ── Bootstrap and trivial config ─────────────────────────────────────
    '!src/core/infrastructure/main.ts',
    '!src/core/infrastructure/app.controller.ts',
    '!src/core/config/database/**',
    '!src/core/config/swagger/**',

    // ── SQL Migrations ────────────────────────────────────────────────────
    '!src/core/infrastructure/migrations/**',

    // ── TypeORM Entities (metadata decorators, no logic) ─────────────────
    '!src/**/infrastructure/persistence/entities/**',
    '!src/**/infrastructure/entities/**',
    '!src/shared/infrastructure/persistence/entities/**',
    '!src/shared/infrastructure/base/**',

    // ── HTTP Controllers (integration/e2e scope — guard-driven, no unit logic) ──
    '!src/**/infrastructure/http/controllers/**',

    // ── Infrastructure requiring real services (e2e scope) ────────────────
    '!src/**/infrastructure/persistence/repositories/**',
    '!src/**/infrastructure/repositories/**',
    '!src/**/infrastructure/adapters/**',
    '!src/shared/infrastructure/database/**',
    '!src/shared/infrastructure/email/providers/**',

    // ── Email HTML templates (not application logic) ──────────────────────
    '!src/shared/infrastructure/email/templates/**',

    // ── TypeScript interfaces/contracts (no runtime code) ─────────────────
    '!src/shared/infrastructure/email/contracts/**',

    // ── DTOs (class-validator decorators only, no logic) ─────────────────
    '!src/**/*.dto.ts',

    // ── Dead/orphaned exception (no longer referenced in any saga or handler) ────
    '!src/bounded-contexts/authentication/domain/exceptions/social-account-required.exception.ts',

    // ── Future-feature scaffolding (not yet wired to any saga or handler) ────────
    '!src/bounded-contexts/user/domain/events/account-became-flexible.event.ts',
    '!src/bounded-contexts/user/domain/events/provider-linked.event.ts',
    '!src/bounded-contexts/user/profile/domain/models/commercial-profile.model.ts',
    '!src/bounded-contexts/user/profile/infrastructure/mappers/commercial-profile.mapper.ts',
    '!src/bounded-contexts/user/account/session/domain/session.aggregate.ts',
    '!src/bounded-contexts/user/account/session/infrastructure/mappers/session.mapper.ts',
    '!src/bounded-contexts/user/account/session/infrastructure/repositories/typeorm-session.repository.ts',

    // ── Passport OAuth strategies (integration scope — require Passport internals) ──
    '!src/**/infrastructure/strategies/**',

    // ── OAuth redirect-only controllers (no business logic, guard-driven) ─
    '!src/**/infrastructure/controllers/google-authentication/**',
    '!src/**/infrastructure/controllers/facebook-authentication/**',
    '!src/**/infrastructure/controllers/microsoft-authentication/**',
    '!src/**/infrastructure/controllers/apple-authentication/**',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@storage/(.*)$': '<rootDir>/src/bounded-contexts/storage/$1',
    '^@tenant/(.*)$': '<rootDir>/src/bounded-contexts/tenant/$1',
    '^@authentication/(.*)$': '<rootDir>/src/bounded-contexts/authentication/$1',
    '^@user/(.*)$': '<rootDir>/src/bounded-contexts/user/$1',
    '^@test-mockup/(.*)$': '<rootDir>/test/__mocks__/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^uuid$': require.resolve('uuid'),
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
};
