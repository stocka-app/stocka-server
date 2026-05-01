import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidStorageNameException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_STORAGE_NAME', [{ field: 'name', message }]);
  }
}
