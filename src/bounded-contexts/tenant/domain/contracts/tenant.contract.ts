import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface ITenantContract {
  findById(id: number): Promise<Persisted<TenantAggregate> | null>;
  findByUUID(uuid: string): Promise<Persisted<TenantAggregate> | null>;
  findBySlug(slug: string): Promise<Persisted<TenantAggregate> | null>;
  persist(tenant: TenantAggregate): Promise<Persisted<TenantAggregate>>;
}
