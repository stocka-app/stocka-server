import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';

export class GetInvitationsQuery {
  constructor(public readonly tenantId: number) {}
}

export type GetInvitationsResult = Result<TenantInvitationModel[], DomainException>;
