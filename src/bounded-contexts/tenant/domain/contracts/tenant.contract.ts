import { TenantAggregate } from '@tenant/domain/tenant.aggregate';

export interface ITenantContract {
  findById(id: number): Promise<TenantAggregate | null>;
  findByUUID(uuid: string): Promise<TenantAggregate | null>;
  findBySlug(slug: string): Promise<TenantAggregate | null>;
  persist(tenant: TenantAggregate): Promise<TenantAggregate>;
}
