const unitExclusions = require('./test/coverage-exclusions-unit');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': '@swc/jest',
  },
  collectCoverageFrom: unitExclusions,
  testPathIgnorePatterns: ['/node_modules/', '/.claude/'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
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
    '^uuid$': require.resolve('uuid'),
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\](?!uuid[/\\\\])'],
  // Per-layer threshold removed: many controllers / sagas / repos are exercised
  // only through E2E and reach 0% in isolation. The Definition-of-Done is the
  // MERGED report (unit + e2e) — see scripts/merge-coverage.js.
};
