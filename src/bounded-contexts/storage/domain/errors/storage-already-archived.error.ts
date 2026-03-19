import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageAlreadyArchivedError extends BusinessLogicException {
  constructor(identifier: string) {
    super(`Storage "${identifier}" is already archived`, 'STORAGE_ALREADY_ARCHIVED');
  }
}
