import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetMyTenantQuery,
  GetMyTenantQueryResult,
} from '@tenant/application/queries/get-my-tenant/get-my-tenant.query';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok } from '@shared/domain/result';

@QueryHandler(GetMyTenantQuery)
export class GetMyTenantHandler implements IQueryHandler<GetMyTenantQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_CONTRACT)
    private readonly tenantContract: ITenantContract,
  ) {}

  async execute(query: GetMyTenantQuery): Promise<GetMyTenantQueryResult> {
    const tenant = await this.tenantContract.findById(query.tenantId);
    return ok(tenant!);
  }
}
