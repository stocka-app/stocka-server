import { DomainException } from '@/shared/domain/exceptions/domain.exception';

export abstract class BusinessLogicException extends DomainException {
  constructor(
    message: string,
    errorCode: string = 'BUSINESS_LOGIC_ERROR',
    details: { field: string; message: string }[] = [],
  ) {
    super(message, errorCode, details);
  }
}
