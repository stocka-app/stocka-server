import { DomainException } from '@/shared/domain/exceptions/domain.exception';

export class InvalidVerificationTypeException extends DomainException {
  constructor(value: string) {
    super(`Invalid verification type: ${value}`, 'INVALID_VERIFICATION_TYPE', [
      { field: 'verificationType', message: `Invalid verification type: ${value}` },
    ]);
  }
}
