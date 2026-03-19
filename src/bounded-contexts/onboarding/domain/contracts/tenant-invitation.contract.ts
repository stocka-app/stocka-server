import { TenantInvitationModel } from '@onboarding/domain/models/tenant-invitation.model';

export interface ITenantInvitationContract {
  findByToken(token: string): Promise<TenantInvitationModel | null>;
  markAccepted(id: string): Promise<void>;
}
