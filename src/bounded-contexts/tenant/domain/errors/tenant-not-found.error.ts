import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';

export class TenantNotFoundError extends ResourceNotFoundException {
  constructor(identifier: string) {
    super('Tenant', identifier, 'TENANT_NOT_FOUND');
  }
}
