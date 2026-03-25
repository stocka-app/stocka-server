import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from '@core/infrastructure/app.module';
import { APP_CONSTANTS } from '@common/constants/app.constants';
import { globalValidationPipe } from '@common/pipes/validation.pipe';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from '@common/interceptors/timeout.interceptor';
import { TransformInterceptor } from '@shared/infrastructure/interceptors/transform.interceptor';
import { setupSwagger } from '@core/config/swagger/swagger.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix(APP_CONSTANTS.API_PREFIX);

  // Security
  app.use(helmet());

  // Cookie parser (required for httpOnly cookie refresh token)
  app.use(cookieParser());

  // Trust first proxy hop — required for correct IP resolution behind load balancers / reverse proxies
  app.set('trust proxy', 1);

  // CORS — supports comma-separated origins for multi-environment deployments
  const rawOrigins = configService
    .getOrThrow<string>('CORS_ORIGIN')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: rawOrigins.length === 1 ? rawOrigins[0] : rawOrigins,
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(globalValidationPipe);

  // Global filters (order matters: most specific first)
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
    new DomainExceptionFilter(),
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger (development only)
  if (configService.get<string>('NODE_ENV') === 'development') {
    setupSwagger(app);
  }

  const port = configService.get<number>('PORT', APP_CONSTANTS.DEFAULT_PORT);
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/${APP_CONSTANTS.API_PREFIX}`);
  logger.log(`Swagger docs available at: http://localhost:${port}/docs`);
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error('Error starting application:', err);
  process.exit(1);
});
