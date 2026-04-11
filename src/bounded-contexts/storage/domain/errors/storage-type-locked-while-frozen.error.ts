import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageTypeLockedWhileFrozenError extends BusinessLogicException {
  constructor(identifier: string) {
    super(
      `Cannot change type of storage "${identifier}" while it is frozen. Restore it first.`,
      'STORAGE_TYPE_LOCKED_WHILE_FROZEN',
    );
  }
}
