import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';

export interface ITenantMemberContract {
  findByTenantAndUserId(tenantId: number, userId: number): Promise<TenantMemberModel | null>;
  findActiveByUserUUID(userUUID: string): Promise<TenantMemberModel | null>;
  findAllByTenantId(tenantId: number): Promise<TenantMemberModel[]>;
  persist(member: TenantMemberModel): Promise<TenantMemberModel>;
}
