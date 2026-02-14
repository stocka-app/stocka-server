import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class RateLimitExceededException extends BusinessLogicException {
  constructor(limitType: 'ip' | 'email') {
    const message =
      limitType === 'ip'
        ? 'Too many requests from this IP address. Please try again later.'
        : 'Too many verification attempts for this email. Please try again later.';

    super(message, 'RATE_LIMIT_EXCEEDED', [
      {
        field: limitType,
        message: `Rate limit exceeded for ${limitType}`,
      },
    ]);
  }
}
