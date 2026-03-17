import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

describe('Authentication Providers (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const workerApp = await getWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
  });

  afterAll(async () => {
    await truncateWorkerTables(dataSource);
  });

  // ---------------------------------------------------------------------------
  // Public endpoint — no auth required
  // ---------------------------------------------------------------------------

  describe('Given any client without authentication', () => {
    describe('When they call GET /api/authentication/providers', () => {
      it('Then they receive a 200 with providers array and emailPasswordEnabled: true', async () => {
        const res = await request(app.getHttpServer()).get('/api/authentication/providers');

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body.providers)).toBe(true);
        expect(res.body.emailPasswordEnabled).toBe(true);
      });

      it('Then each provider in the list has the required shape: id, name, enabled, authUrl', async () => {
        const res = await request(app.getHttpServer()).get('/api/authentication/providers');

        expect(res.status).toBe(HttpStatus.OK);

        for (const provider of res.body.providers as unknown[]) {
          const p = provider as Record<string, unknown>;
          expect(typeof p['id']).toBe('string');
          expect(typeof p['name']).toBe('string');
          expect(typeof p['enabled']).toBe('boolean');
          expect(typeof p['authUrl']).toBe('string');
        }
      });
    });
  });
});
