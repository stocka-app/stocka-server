import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';

export class StorageParentNotFoundError extends ResourceNotFoundException {
  constructor(identifier: string) {
    super('Storage parent', identifier, 'STORAGE_PARENT_NOT_FOUND');
  }
}
