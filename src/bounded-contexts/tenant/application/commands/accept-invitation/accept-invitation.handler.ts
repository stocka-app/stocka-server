import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { AcceptInvitationCommand } from '@tenant/application/commands/accept-invitation/accept-invitation.command';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { MemberAlreadyExistsError } from '@tenant/domain/errors/member-already-exists.error';
import {
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyUsedError,
  InvitationEmailMismatchError,
} from '@shared/domain/errors/invitation';
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

    // user always exists for an authenticated request (UUID from JWT is always valid)
    const userAggregate = await this.mediator.user.findByUUID(command.userUUID);

    const joinedAt = new Date();
    const userId = userAggregate!.id;

    await this.uow.execute(async () => {
      await this.memberContract.persist(
        TenantMemberModel.create({
          tenantId: invitation.tenantId,
          userId,
          userUUID: command.userUUID,
          role: invitation.role,
        }),
      );
      await this.invitationContract.markAccepted(invitation.id);
    });

    return ok({
      tenantUUID: invitation.tenantUUID,
      tenantName: invitation.tenantName,
      role: invitation.role,
      joinedAt,
    });
  }
}
