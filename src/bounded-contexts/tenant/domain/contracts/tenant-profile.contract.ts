import { TenantProfileModel } from '@tenant/domain/models/tenant-profile.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface ITenantProfileContract {
  findByTenantId(tenantId: number): Promise<Persisted<TenantProfileModel> | null>;
  persist(profile: TenantProfileModel): Promise<Persisted<TenantProfileModel>>;
}
