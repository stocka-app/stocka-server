import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';

export class GetTenantMembersQuery {
  constructor(public readonly tenantId: number) {}
}

export type GetTenantMembersQueryResult = Result<TenantMemberModel[], DomainException>;
