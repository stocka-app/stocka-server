import { HttpException, HttpStatus } from '@nestjs/common';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';
import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';

export const STATUS_MAP: Record<string, number> = {
  // Auth
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  ACCOUNT_DEACTIVATED: HttpStatus.UNAUTHORIZED,
  TOKEN_EXPIRED: HttpStatus.UNAUTHORIZED,
  EMAIL_NOT_VERIFIED: HttpStatus.FORBIDDEN,
  SOCIAL_ACCOUNT_REQUIRED: HttpStatus.FORBIDDEN,
  // Conflict
  EMAIL_ALREADY_EXISTS: HttpStatus.CONFLICT,
  USERNAME_ALREADY_EXISTS: HttpStatus.CONFLICT,
  // Validation
  INVALID_PASSWORD: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_EMAIL: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_USERNAME: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_UUID: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_VERIFICATION_CODE: HttpStatus.BAD_REQUEST,
  VERIFICATION_CODE_EXPIRED: HttpStatus.BAD_REQUEST,
  USER_ALREADY_VERIFIED: HttpStatus.BAD_REQUEST,
  // Rate limiting
  RESEND_COOLDOWN_ACTIVE: HttpStatus.TOO_MANY_REQUESTS,
  MAX_RESENDS_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
  TOO_MANY_VERIFICATION_ATTEMPTS: HttpStatus.BAD_REQUEST,
  VERIFICATION_BLOCKED: HttpStatus.TOO_MANY_REQUESTS,
  RATE_LIMIT_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
  // Email delivery
  EMAIL_DELIVERY_FAILED: HttpStatus.SERVICE_UNAVAILABLE,
  // Tenant
  ONBOARDING_ALREADY_COMPLETED: HttpStatus.CONFLICT,
  TENANT_NOT_FOUND: HttpStatus.NOT_FOUND,
  MEMBER_NOT_FOUND: HttpStatus.NOT_FOUND,
  MEMBER_ALREADY_EXISTS: HttpStatus.CONFLICT,
  CANNOT_REMOVE_LAST_OWNER: HttpStatus.UNPROCESSABLE_ENTITY,
  TENANT_LIMIT_EXCEEDED: HttpStatus.UNPROCESSABLE_ENTITY,
  // RBAC / Policy
  FEATURE_NOT_IN_TIER: HttpStatus.FORBIDDEN,
  ACTION_NOT_ALLOWED: HttpStatus.FORBIDDEN,
  TIER_LIMIT_REACHED: HttpStatus.FORBIDDEN,
};

export function mapDomainErrorToHttp(error: DomainException): HttpException {
  let status: number;

  if (STATUS_MAP[error.errorCode] !== undefined) {
    status = STATUS_MAP[error.errorCode];
  } else if (error instanceof ResourceNotFoundException) {
    status = HttpStatus.NOT_FOUND;
  } else if (error instanceof BusinessLogicException) {
    status = HttpStatus.UNPROCESSABLE_ENTITY;
  } else {
    status = HttpStatus.INTERNAL_SERVER_ERROR;
  }

  const body: Record<string, unknown> = {
    message: error.message,
    error: error.errorCode,
    ...(error.details.length > 0 && { details: error.details }),
    ...(error.metadata && { ...error.metadata }),
  };

  return new HttpException(body, status);
}
