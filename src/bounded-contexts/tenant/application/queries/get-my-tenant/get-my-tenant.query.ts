import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';

export class GetMyTenantQuery {
  constructor(public readonly tenantId: number) {}
}

export type GetMyTenantQueryResult = Result<TenantAggregate, DomainException>;
