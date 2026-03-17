import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';

export class MemberNotFoundError extends ResourceNotFoundException {
  constructor(identifier: string) {
    super('TenantMember', identifier, 'MEMBER_NOT_FOUND');
  }
}
