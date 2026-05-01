import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageNameAlreadyExistsException extends BusinessLogicException {
  constructor(name: string) {
    super(
      `A storage with the name "${name}" already exists in this organization`,
      'STORAGE_NAME_ALREADY_EXISTS',
    );
  }
}
