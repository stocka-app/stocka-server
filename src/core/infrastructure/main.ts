import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
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
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix(APP_CONSTANTS.API_PREFIX);

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN'),
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

  // Swagger (only in non-production)
  if (configService.get<string>('NODE_ENV') !== 'production') {
    setupSwagger(app);
  }

  const port = configService.get<number>('PORT', APP_CONSTANTS.DEFAULT_PORT);
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/${APP_CONSTANTS.API_PREFIX}`);
  console.log(
    `Swagger docs available at: http://localhost:${port}/${APP_CONSTANTS.API_PREFIX}/docs`,
  );
}

void bootstrap();
