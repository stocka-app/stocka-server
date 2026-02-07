import { ValidationPipe, BadRequestException, ValidationError } from '@nestjs/common';

export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  exceptionFactory: (errors: ValidationError[]): BadRequestException => {
    const details = errors.flatMap((error) =>
      Object.values(error.constraints || {}).map((message) => ({
        field: error.property,
        message,
      })),
    );

    return new BadRequestException({
      statusCode: 400,
      message: details[0]?.message || 'Validation failed',
      error: 'VALIDATION_ERROR',
      details,
    });
  },
});
