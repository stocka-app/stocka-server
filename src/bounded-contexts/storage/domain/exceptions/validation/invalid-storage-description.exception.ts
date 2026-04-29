import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidStorageDescriptionException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_STORAGE_DESCRIPTION', [{ field: 'description', message }]);
  }
}
