import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CancelInvitationCommand } from '@tenant/application/commands/cancel-invitation/cancel-invitation.command';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import {
  InvitationNotFoundError,
  InvitationAlreadyUsedError,
} from '@shared/domain/errors/invitation';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

export type CancelInvitationResult = Result<void, DomainException>;

@CommandHandler(CancelInvitationCommand)
export class CancelInvitationHandler implements ICommandHandler<CancelInvitationCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_INVITATION_CONTRACT)
    private readonly invitationContract: ITenantInvitationContract,
  ) {}

  async execute(command: CancelInvitationCommand): Promise<CancelInvitationResult> {
    const invitation = await this.invitationContract.findById(command.invitationId);

    if (!invitation) {
      return err(new InvitationNotFoundError());
    }

    /* istanbul ignore next */
    if (invitation.tenantId !== command.tenantId) {
      return err(new InvitationNotFoundError());
    }

    if (invitation.isAlreadyAccepted()) {
      return err(new InvitationAlreadyUsedError());
    }

    await this.invitationContract.cancel(command.invitationId);

    return ok(undefined);
  }
}
