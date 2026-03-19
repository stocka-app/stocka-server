import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';

export interface CreateInvitationProps {
  tenantId: number;
  tenantUUID: string;
  tenantName: string;
  invitedBy: number;
  email: string;
  role: string;
  token: string;
  expiresAt: Date;
}

export interface ITenantInvitationContract {
  findByToken(token: string): Promise<TenantInvitationModel | null>;
  findById(id: string): Promise<TenantInvitationModel | null>;
  findPendingByEmail(tenantId: number, email: string): Promise<TenantInvitationModel | null>;
  findAllByTenantId(tenantId: number): Promise<TenantInvitationModel[]>;
  create(props: CreateInvitationProps): Promise<TenantInvitationModel>;
  markAccepted(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
}
