import { TenantProfileModel } from '@tenant/domain/models/tenant-profile.model';

export interface ITenantProfileContract {
  findByTenantId(tenantId: number): Promise<TenantProfileModel | null>;
  persist(profile: TenantProfileModel): Promise<TenantProfileModel>;
}
