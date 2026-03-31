const e2eExclusions = require('./coverage-exclusions-e2e');

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
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\](?!uuid[/\\\\])'],
  moduleNameMapper: {
    '^@authorization/(.*)$': '<rootDir>/src/bounded-contexts/authorization/$1',
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
  collectCoverageFrom: e2eExclusions,
  coverageDirectory: './coverage-e2e',
  coverageReporters: ['json', 'text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
