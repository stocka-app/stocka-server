import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { AcceptInvitationCommand } from '@tenant/application/commands/accept-invitation/accept-invitation.command';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { MemberAlreadyExistsError } from '@tenant/domain/errors/member-already-exists.error';
import { InvitationNotFoundError } from '@onboarding/domain/errors/invitation-not-found.error';
import { InvitationExpiredError } from '@onboarding/domain/errors/invitation-expired.error';
import { InvitationAlreadyUsedError } from '@onboarding/domain/errors/invitation-already-used.error';
import { InvitationEmailMismatchError } from '@onboarding/domain/errors/invitation-email-mismatch.error';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

export interface AcceptInvitationSuccess {
  tenantUUID: string;
  tenantName: string;
  role: string;
  joinedAt: Date;
}

export type AcceptInvitationResult = Result<AcceptInvitationSuccess, DomainException>;

@CommandHandler(AcceptInvitationCommand)
export class AcceptInvitationHandler implements ICommandHandler<AcceptInvitationCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_INVITATION_CONTRACT)
    private readonly invitationContract: ITenantInvitationContract,
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
    private readonly mediator: MediatorService,
  ) {}

  async execute(command: AcceptInvitationCommand): Promise<AcceptInvitationResult> {
    const invitation = await this.invitationContract.findByToken(command.token);

    if (!invitation) {
      return err(new InvitationNotFoundError());
    }

    if (invitation.isAlreadyAccepted()) {
      return err(new InvitationAlreadyUsedError());
    }

    if (invitation.isExpired()) {
      return err(new InvitationExpiredError());
    }

    if (!invitation.emailMatches(command.userEmail)) {
      return err(new InvitationEmailMismatchError());
    }

    const existingMember = await this.memberContract.findActiveByUserUUID(command.userUUID);
    if (existingMember && existingMember.tenantId === invitation.tenantId) {
      return err(new MemberAlreadyExistsError());
    }

    const userAggregate = await this.mediator.user.findByUUID(command.userUUID);
    if (!userAggregate?.id) {
      return err(new InvitationNotFoundError());
    }

    const joinedAt = new Date();

    await this.uow.begin();
    try {
      const member = TenantMemberModel.create({
        tenantId: invitation.tenantId,
        userId: userAggregate.id,
        userUUID: command.userUUID,
        role: invitation.role,
      });

      await this.memberContract.persist(member);
      await this.invitationContract.markAccepted(invitation.id);

      await this.uow.commit();

      return ok({
        tenantUUID: invitation.tenantUUID,
        tenantName: invitation.tenantName,
        role: invitation.role,
        joinedAt,
      });
    } catch (e) {
      await this.uow.rollback();
      if (e instanceof DomainException) return err(e);
      throw e;
    }
  }
}
