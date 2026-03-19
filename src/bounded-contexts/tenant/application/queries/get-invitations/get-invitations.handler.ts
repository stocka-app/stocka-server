import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetInvitationsQuery,
  GetInvitationsResult,
} from '@tenant/application/queries/get-invitations/get-invitations.query';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok } from '@shared/domain/result';

@QueryHandler(GetInvitationsQuery)
export class GetInvitationsHandler implements IQueryHandler<GetInvitationsQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_INVITATION_CONTRACT)
    private readonly invitationContract: ITenantInvitationContract,
  ) {}

  async execute(query: GetInvitationsQuery): Promise<GetInvitationsResult> {
    const invitations = await this.invitationContract.findAllByTenantId(query.tenantId);
    return ok(invitations);
  }
}
