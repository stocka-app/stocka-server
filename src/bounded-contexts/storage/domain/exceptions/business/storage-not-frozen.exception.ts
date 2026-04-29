import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageNotFrozenException extends BusinessLogicException {
  constructor(identifier: string) {
    super(`Storage "${identifier}" is not in FROZEN state`, 'STORAGE_NOT_FROZEN');
  }
}
