import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CommandBus } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { SocialSignInCommand } from '@authentication/application/commands/social-sign-in/social-sign-in.command';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { getWorkerApp, truncateWorkerTables, resetEmailMock } from '@test/worker-app';

describe('Password Reset (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let commandBus: CommandBus;
  let emailProvider: jest.Mocked<IEmailProviderContract>;

  beforeAll(async () => {
    const workerApp = await getWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateWorkerTables(dataSource);
    commandBus = app.get(CommandBus);
    emailProvider = app.get<jest.Mocked<IEmailProviderContract>>(
      INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT,
    );
  });

  afterAll(async () => {
    await truncateWorkerTables(dataSource);
  });

  beforeEach(() => {
    resetEmailMock();
  });

  it('should request password reset and send email for an existing user', async () => {
    // Create a user first
    await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email: 'forgotpw@example.com', username: 'forgotpwuser', password: 'SecurePass1!' });

    const res = await request(app.getHttpServer())
      .post('/api/authentication/forgot-password')
      .send({ email: 'forgotpw@example.com' })
      .expect(HttpStatus.OK);
    expect(res.body.message).toContain('reset link has been sent');

    // Allow event handlers to flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('should not reveal if email does not exist', async () => {
    const email = 'nonexistent@example.com';
    const res = await request(app.getHttpServer())
      .post('/api/authentication/forgot-password')
      .send({ email })
      .expect(HttpStatus.OK);
    expect(res.body.message).toContain('reset link has been sent');
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — social account (no password)
  // ---------------------------------------------------------------------------

  describe('Given a user who registered via social sign-in (has no password)', () => {
    describe('When they request a password reset', () => {
      it('Then they receive a 200 with the generic message — isSocialAccount branch is exercised', async () => {
        // Create a social-only user
        await commandBus.execute(
          new SocialSignInCommand(
            'social.forgot@example.com',
            'Social Forgot',
            'google',
            'google-forgot-uid-001',
            null,
            null,
            null,
            null,
            false,
            null,
            {},
          ),
        );

        const res = await request(app.getHttpServer())
          .post('/api/authentication/forgot-password')
          .send({ email: 'social.forgot@example.com' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.message).toContain('reset link has been sent');
      });
    });
  });
});
