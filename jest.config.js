module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/core/infrastructure/main.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/bounded-contexts/(.*)$': '<rootDir>/src/bounded-contexts/$1',
    '^@/auth/(.*)$': '<rootDir>/src/bounded-contexts/auth/$1',
    '^@/user/(.*)$': '<rootDir>/src/bounded-contexts/user/$1',
    '^@/shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@/common/(.*)$': '<rootDir>/src/common/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': require.resolve('uuid'),
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
};
