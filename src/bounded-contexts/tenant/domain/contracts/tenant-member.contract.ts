import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface ITenantMemberContract {
  findByTenantAndUserId(tenantId: number, userId: number): Promise<Persisted<TenantMemberModel> | null>;
  findActiveByUserUUID(userUUID: string): Promise<Persisted<TenantMemberModel> | null>;
  findAllByTenantId(tenantId: number): Promise<Persisted<TenantMemberModel>[]>;
  persist(member: TenantMemberModel): Promise<Persisted<TenantMemberModel>>;
}
