import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidStorageIconException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_STORAGE_ICON', [{ field: 'icon', message }]);
  }
}
