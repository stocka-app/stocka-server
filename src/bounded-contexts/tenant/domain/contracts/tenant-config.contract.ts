import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';

export interface ITenantConfigContract {
  findByTenantId(tenantId: number): Promise<TenantConfigModel | null>;
  persist(config: TenantConfigModel): Promise<TenantConfigModel>;
}
