import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface ITenantConfigContract {
  findByTenantId(tenantId: number): Promise<Persisted<TenantConfigModel> | null>;
  persist(config: TenantConfigModel): Promise<Persisted<TenantConfigModel>>;
}
