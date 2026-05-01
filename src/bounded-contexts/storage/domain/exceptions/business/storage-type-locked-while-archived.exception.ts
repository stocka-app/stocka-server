import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageTypeLockedWhileArchivedException extends BusinessLogicException {
  constructor(identifier: string) {
    super(
      `Cannot change type of storage "${identifier}" while it is archived. Restore it first.`,
      'STORAGE_TYPE_LOCKED_WHILE_ARCHIVED',
    );
  }
}
