import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';

export class GetInvitationByTokenQuery {
  constructor(public readonly token: string) {}
}

export type GetInvitationByTokenResult = Result<TenantInvitationModel, DomainException>;
