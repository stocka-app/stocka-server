import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetInvitationByTokenQuery,
  GetInvitationByTokenResult,
} from '@tenant/application/queries/get-invitation-by-token/get-invitation-by-token.query';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import {
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyUsedError,
} from '@shared/domain/errors/invitation';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok, err } from '@shared/domain/result';

@QueryHandler(GetInvitationByTokenQuery)
export class GetInvitationByTokenHandler implements IQueryHandler<GetInvitationByTokenQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_INVITATION_CONTRACT)
    private readonly invitationContract: ITenantInvitationContract,
  ) {}

  async execute(query: GetInvitationByTokenQuery): Promise<GetInvitationByTokenResult> {
    const invitation = await this.invitationContract.findByToken(query.token);

    if (!invitation) {
      return err(new InvitationNotFoundError());
    }

    if (invitation.isAlreadyAccepted()) {
      return err(new InvitationAlreadyUsedError());
    }

    if (invitation.isExpired()) {
      return err(new InvitationExpiredError());
    }

    return ok(invitation);
  }
}
