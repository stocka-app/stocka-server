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
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '7d',
  CORS_ORIGIN: 'http://localhost:5173',
  RESEND_API_KEY: 're_test_key',
};

describe('Environment validation — startup fail-fast', () => {
  describe('Given the application is booting without RESEND_API_KEY configured', () => {
    it('When the config validator runs, Then the server should refuse to start', () => {
      const { RESEND_API_KEY: _removed, ...environmentWithoutApiKey } = validEnvironment;

      expect(() => validate(environmentWithoutApiKey)).toThrow();
    });
  });

  describe('Given the application is booting with all required variables configured', () => {
    it('When the config validator runs, Then the server should start successfully', () => {
      expect(() => validate(validEnvironment)).not.toThrow();
    });
  });
});
