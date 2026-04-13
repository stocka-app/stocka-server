import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageAlreadyFrozenError extends BusinessLogicException {
  constructor(identifier: string) {
    super(`Storage "${identifier}" is already frozen`, 'STORAGE_ALREADY_FROZEN');
  }
}
