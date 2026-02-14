import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';
import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly STATUS_MAP: Record<string, number> = {
    // Auth errors
    INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
    ACCOUNT_DEACTIVATED: HttpStatus.UNAUTHORIZED,
    TOKEN_EXPIRED: HttpStatus.UNAUTHORIZED,
    EMAIL_NOT_VERIFIED: HttpStatus.FORBIDDEN,
    // Conflict errors
    EMAIL_ALREADY_EXISTS: HttpStatus.CONFLICT,
    USERNAME_ALREADY_EXISTS: HttpStatus.CONFLICT,
    // Validation errors
    INVALID_PASSWORD: HttpStatus.UNPROCESSABLE_ENTITY,
    INVALID_EMAIL: HttpStatus.UNPROCESSABLE_ENTITY,
    INVALID_USERNAME: HttpStatus.UNPROCESSABLE_ENTITY,
    INVALID_UUID: HttpStatus.UNPROCESSABLE_ENTITY,
    INVALID_VERIFICATION_CODE: HttpStatus.BAD_REQUEST,
    VERIFICATION_CODE_EXPIRED: HttpStatus.BAD_REQUEST,
    USER_ALREADY_VERIFIED: HttpStatus.BAD_REQUEST,
    // Rate limiting errors
    RESEND_COOLDOWN_ACTIVE: HttpStatus.TOO_MANY_REQUESTS,
    MAX_RESENDS_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
    TOO_MANY_VERIFICATION_ATTEMPTS: HttpStatus.BAD_REQUEST,
    VERIFICATION_BLOCKED: HttpStatus.TOO_MANY_REQUESTS,
    RATE_LIMIT_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
    // Email delivery errors
    EMAIL_DELIVERY_FAILED: HttpStatus.SERVICE_UNAVAILABLE,
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
      ...(exception.metadata && { ...exception.metadata }),
    });
  }
}
