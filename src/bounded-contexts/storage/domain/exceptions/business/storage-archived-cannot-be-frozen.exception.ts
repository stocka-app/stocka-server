import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageArchivedCannotBeFrozenException extends BusinessLogicException {
  constructor(identifier: string) {
    super(
      `Storage "${identifier}" is archived and cannot be frozen — restore it first`,
      'STORAGE_ARCHIVED_CANNOT_BE_FROZEN',
    );
  }
}
