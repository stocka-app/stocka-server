import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageArchivedCannotBeUpdatedError extends BusinessLogicException {
  constructor(identifier: string) {
    super(
      `Storage "${identifier}" is archived and cannot be updated. Restore it first.`,
      'STORAGE_ARCHIVED_CANNOT_BE_UPDATED',
    );
  }
}
