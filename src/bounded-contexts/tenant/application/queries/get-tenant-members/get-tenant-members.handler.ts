import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetTenantMembersQuery,
  GetTenantMembersQueryResult,
} from '@tenant/application/queries/get-tenant-members/get-tenant-members.query';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok } from '@shared/domain/result';

@QueryHandler(GetTenantMembersQuery)
export class GetTenantMembersHandler implements IQueryHandler<GetTenantMembersQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
  ) {}

  async execute(query: GetTenantMembersQuery): Promise<GetTenantMembersQueryResult> {
    const members = await this.memberContract.findAllByTenantId(query.tenantId);
    return ok(members);
  }
}
