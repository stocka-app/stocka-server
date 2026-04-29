import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';

export class StorageNotFoundException extends ResourceNotFoundException {
  constructor(identifier: string) {
    super('Storage', identifier, 'STORAGE_NOT_FOUND');
  }
}
