import 'reflect-metadata';
import { validate } from '@core/config/environment/env.validation';

const validEnvironment: Record<string, unknown> = {
  NODE_ENV: 'development',
  PORT: 3001,
  API_PREFIX: 'api',
  FRONTEND_URL: 'http://localhost:5173',
  REQUEST_TIMEOUT_MS: 5000,
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_DATABASE: 'stocka',
  JWT_ACCESS_SECRET: 'access-secret-minimum-32-chars-test!!',
  JWT_REFRESH_SECRET: 'refresh-secret-minimum-32-chars-test!',
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '7d',
  OAUTH_STATE_SECRET: 'oauth-state-secret-test-value-here!!',
  CORS_ORIGIN: 'http://localhost:5173',
  RESEND_API_KEY: 're_test_key',
};

describe('Environment validation — startup fail-fast', () => {
  describe('Given the application is booting without RESEND_API_KEY configured', () => {
    it('When the config validator runs, Then the server should refuse to start', () => {
      const environmentWithoutApiKey = Object.fromEntries(
        Object.entries(validEnvironment).filter(([k]) => k !== 'RESEND_API_KEY'),
      );

      expect(() => validate(environmentWithoutApiKey)).toThrow();
    });
  });

  describe('Given the application is booting without OAUTH_STATE_SECRET configured', () => {
    it('When the config validator runs, Then the server should refuse to start', () => {
      const environmentWithoutOAuthSecret = Object.fromEntries(
        Object.entries(validEnvironment).filter(([k]) => k !== 'OAUTH_STATE_SECRET'),
      );

      expect(() => validate(environmentWithoutOAuthSecret)).toThrow();
    });
  });

  describe('Given JWT secrets that are too short (under 32 characters)', () => {
    it('When the config validator runs, Then the server should refuse to start', () => {
      const environmentWithWeakJwt = { ...validEnvironment, JWT_ACCESS_SECRET: 'short-secret' };

      expect(() => validate(environmentWithWeakJwt)).toThrow();
    });
  });

  describe('Given the application is booting with all required variables configured', () => {
    it('When the config validator runs, Then the server should start successfully', () => {
      expect(() => validate(validEnvironment)).not.toThrow();
    });
  });
});
