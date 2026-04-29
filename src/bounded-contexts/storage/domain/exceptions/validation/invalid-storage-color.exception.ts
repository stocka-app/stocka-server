import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidStorageColorException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_STORAGE_COLOR', [{ field: 'color', message }]);
  }
}
