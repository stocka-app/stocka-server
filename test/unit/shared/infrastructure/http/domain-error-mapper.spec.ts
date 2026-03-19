import { HttpStatus, HttpException } from '@nestjs/common';
import { mapDomainErrorToHttp, STATUS_MAP } from '@shared/infrastructure/http/domain-error-mapper';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';
import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';

// ── Concrete test doubles ─────────────────────────────────────────────────────

class StubDomainException extends DomainException {
  constructor(
    message: string,
    errorCode: string,
    details: { field: string; message: string }[] = [],
    metadata?: Record<string, unknown>,
  ) {
    super(message, errorCode, details, metadata);
  }
}

class StubBusinessLogicException extends BusinessLogicException {
  constructor(message: string) {
    super(message, 'CUSTOM_BUSINESS_ERROR');
  }
}

class StubResourceNotFoundException extends ResourceNotFoundException {
  constructor() {
    super('User', '123', 'USER_NOT_FOUND');
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('mapDomainErrorToHttp', () => {
  describe('Given a DomainException with an errorCode that exists in STATUS_MAP', () => {
    it('Then it maps INVALID_CREDENTIALS to 401 Unauthorized', () => {
      const error = new StubDomainException('bad creds', 'INVALID_CREDENTIALS');
      const result = mapDomainErrorToHttp(error);
      expect(result).toBeInstanceOf(HttpException);
      expect(result.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('Then it maps EMAIL_NOT_VERIFIED to 403 Forbidden', () => {
      const error = new StubDomainException('not verified', 'EMAIL_NOT_VERIFIED');
      const result = mapDomainErrorToHttp(error);
      expect(result.getStatus()).toBe(HttpStatus.FORBIDDEN);
    });

    it('Then it maps EMAIL_ALREADY_EXISTS to 409 Conflict', () => {
      const error = new StubDomainException('exists', 'EMAIL_ALREADY_EXISTS');
      const result = mapDomainErrorToHttp(error);
      expect(result.getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('Then it maps INVALID_PASSWORD to 422 Unprocessable Entity', () => {
      const error = new StubDomainException('weak', 'INVALID_PASSWORD');
      const result = mapDomainErrorToHttp(error);
      expect(result.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('Then it maps RATE_LIMIT_EXCEEDED to 429 Too Many Requests', () => {
      const error = new StubDomainException('rate limit', 'RATE_LIMIT_EXCEEDED');
      const result = mapDomainErrorToHttp(error);
      expect(result.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('Then it maps EMAIL_DELIVERY_FAILED to 503 Service Unavailable', () => {
      const error = new StubDomainException('delivery', 'EMAIL_DELIVERY_FAILED');
      const result = mapDomainErrorToHttp(error);
      expect(result.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe('Given a ResourceNotFoundException with an errorCode not in STATUS_MAP', () => {
    it('Then it maps to 404 Not Found', () => {
      const error = new StubResourceNotFoundException();
      const result = mapDomainErrorToHttp(error);
      expect(result.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('Given a BusinessLogicException with an errorCode not in STATUS_MAP', () => {
    it('Then it maps to 422 Unprocessable Entity', () => {
      const error = new StubBusinessLogicException('custom business rule violated');
      const result = mapDomainErrorToHttp(error);
      expect(result.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });
  });

  describe('Given a generic DomainException with an unknown errorCode', () => {
    it('Then it maps to 500 Internal Server Error', () => {
      const error = new StubDomainException('unknown', 'COMPLETELY_UNKNOWN_CODE');
      const result = mapDomainErrorToHttp(error);
      expect(result.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('Given a DomainException with details', () => {
    it('Then the response body includes the details array', () => {
      const error = new StubDomainException('validation failed', 'INVALID_PASSWORD', [
        { field: 'password', message: 'too weak' },
      ]);
      const result = mapDomainErrorToHttp(error);
      const body = result.getResponse() as Record<string, unknown>;
      expect(body['details']).toEqual([{ field: 'password', message: 'too weak' }]);
    });
  });

  describe('Given a DomainException without details', () => {
    it('Then the response body does not include the details key', () => {
      const error = new StubDomainException('no details', 'INVALID_CREDENTIALS');
      const result = mapDomainErrorToHttp(error);
      const body = result.getResponse() as Record<string, unknown>;
      expect(body['details']).toBeUndefined();
    });
  });

  describe('Given a DomainException with metadata', () => {
    it('Then the response body spreads the metadata fields', () => {
      const error = new StubDomainException('rate limited', 'RATE_LIMIT_EXCEEDED', [], {
        retryAfterSeconds: 60,
      });
      const result = mapDomainErrorToHttp(error);
      const body = result.getResponse() as Record<string, unknown>;
      expect(body['retryAfterSeconds']).toBe(60);
    });
  });

  describe('Given the STATUS_MAP', () => {
    it('Then it contains all expected auth error codes', () => {
      expect(STATUS_MAP).toMatchObject({
        INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
        ACCOUNT_DEACTIVATED: HttpStatus.UNAUTHORIZED,
        TOKEN_EXPIRED: HttpStatus.UNAUTHORIZED,
        EMAIL_NOT_VERIFIED: HttpStatus.FORBIDDEN,
        SOCIAL_ACCOUNT_REQUIRED: HttpStatus.FORBIDDEN,
        EMAIL_ALREADY_EXISTS: HttpStatus.CONFLICT,
        USERNAME_ALREADY_EXISTS: HttpStatus.CONFLICT,
        INVALID_PASSWORD: HttpStatus.UNPROCESSABLE_ENTITY,
        RATE_LIMIT_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
        EMAIL_DELIVERY_FAILED: HttpStatus.SERVICE_UNAVAILABLE,
      });
    });

    it('Then it contains all expected RBAC / Policy error codes', () => {
      expect(STATUS_MAP).toMatchObject({
        FEATURE_NOT_IN_TIER: HttpStatus.FORBIDDEN,
        ACTION_NOT_ALLOWED: HttpStatus.FORBIDDEN,
        TIER_LIMIT_REACHED: HttpStatus.FORBIDDEN,
      });
    });
  });
});
