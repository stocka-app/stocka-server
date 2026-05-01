import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageAlreadyArchivedException extends BusinessLogicException {
  constructor(identifier: string) {
    super(`Storage "${identifier}" is already archived`, 'STORAGE_ALREADY_ARCHIVED');
  }
}
