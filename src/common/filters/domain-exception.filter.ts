import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '@/shared/domain/exceptions/domain.exception';
import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';
import { ResourceNotFoundException } from '@/shared/domain/exceptions/resource-not-found.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly STATUS_MAP: Record<string, number> = {
    INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
    ACCOUNT_DEACTIVATED: HttpStatus.UNAUTHORIZED,
    TOKEN_EXPIRED: HttpStatus.UNAUTHORIZED,
    EMAIL_ALREADY_EXISTS: HttpStatus.CONFLICT,
    USERNAME_ALREADY_EXISTS: HttpStatus.CONFLICT,
    INVALID_PASSWORD: HttpStatus.UNPROCESSABLE_ENTITY,
    INVALID_EMAIL: HttpStatus.UNPROCESSABLE_ENTITY,
    INVALID_USERNAME: HttpStatus.UNPROCESSABLE_ENTITY,
    INVALID_UUID: HttpStatus.UNPROCESSABLE_ENTITY,
  };

  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;

    if (this.STATUS_MAP[exception.errorCode]) {
      status = this.STATUS_MAP[exception.errorCode];
    } else if (exception instanceof ResourceNotFoundException) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof BusinessLogicException) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: exception.errorCode,
      ...(exception.details.length > 0 && { details: exception.details }),
    });
  }
}
