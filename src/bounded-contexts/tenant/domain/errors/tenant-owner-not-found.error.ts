import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';

export class TenantOwnerNotFoundError extends ResourceNotFoundException {
  constructor(userUUID: string) {
    super('User', userUUID, 'TENANT_OWNER_NOT_FOUND');
  }
}
