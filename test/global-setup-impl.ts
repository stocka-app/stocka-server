/**
 * Jest global setup — runs ONCE before all e2e specs.
 *
 * Drops and recreates the test schema a single time, eliminating the
 * ~20-40s per-spec dropSchema+synchronize overhead (previously: 12+ times).
 *
 * Each spec must use:
 *   synchronize: false
 *   dropSchema: false   ← omitted / not set
 *
 * and handle its own data cleanup via DELETE in beforeEach/afterEach.
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { UserModule } from '@user/infrastructure/user.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import databaseConfig from '@core/config/database/database.config';
import { validate } from '@core/config/environment/env.validation';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';

const emailProviderMock: IEmailProviderContract = {
  sendEmail: async () => ({ id: 'mock', success: true }),
  sendVerificationEmail: async () => ({ id: 'mock', success: true }),
  sendWelcomeEmail: async () => ({ id: 'mock', success: true }),
  sendPasswordResetEmail: async () => ({ id: 'mock', success: true }),
};

export default async function globalSetup(): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [databaseConfig],
        validate,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5434', 10),
        username: process.env.DB_USERNAME || 'stocka',
        password: process.env.DB_PASSWORD || 'stocka_dev',
        database: process.env.DB_DATABASE || 'stocka_test',
        autoLoadEntities: true,
        dropSchema: true,
        synchronize: true,
        logging: false,
      }),
      EmailModule,
      UnitOfWorkModule,
      UserModule,
      AuthenticationModule,
      MediatorModule,
    ],
  })
    .overrideProvider(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    .useValue(emailProviderMock)
    .compile();

  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();
  await app.close();
}
