import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidStorageAddressException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_STORAGE_ADDRESS', [{ field: 'address', message }]);
  }
}
