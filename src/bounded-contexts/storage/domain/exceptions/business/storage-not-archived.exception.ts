import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageNotArchivedException extends BusinessLogicException {
  constructor(identifier: string) {
    super(`Storage "${identifier}" is not in ARCHIVED state`, 'STORAGE_NOT_ARCHIVED');
  }
}
