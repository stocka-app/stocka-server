import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageNotArchivedError extends BusinessLogicException {
  constructor(identifier: string) {
    super(`Storage "${identifier}" is not in ARCHIVED state`, 'STORAGE_NOT_ARCHIVED');
  }
}
