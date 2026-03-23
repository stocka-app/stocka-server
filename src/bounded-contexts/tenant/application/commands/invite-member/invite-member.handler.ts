import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InviteMemberCommand } from '@tenant/application/commands/invite-member/invite-member.command';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { InvitationAlreadyPendingError } from '@tenant/domain/errors/invitation-already-pending.error';
import { InsufficientPermissionsError } from '@tenant/domain/errors/insufficient-permissions.error';
import { RoleHierarchyService } from '@tenant/domain/services/role-hierarchy.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

const INVITATION_TTL_HOURS = 72;

export interface InviteMemberSuccess {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  createdAt: Date;
}

export type InviteMemberError = InvitationAlreadyPendingError | InsufficientPermissionsError;
export type InviteMemberResult = Result<InviteMemberSuccess, DomainException>;

@CommandHandler(InviteMemberCommand)
export class InviteMemberHandler implements ICommandHandler<InviteMemberCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_INVITATION_CONTRACT)
    private readonly invitationContract: ITenantInvitationContract,
    private readonly roleHierarchyService: RoleHierarchyService,
  ) {}

  async execute(command: InviteMemberCommand): Promise<InviteMemberResult> {
    const canAssign = await this.roleHierarchyService.canAssignRole(
      command.inviterRole,
      command.role,
    );
    if (!canAssign) {
      return err(new InsufficientPermissionsError());
    }

    const pendingInvitation = await this.invitationContract.findPendingByEmail(
      command.tenantId,
      command.email,
    );

    if (pendingInvitation) {
      return err(new InvitationAlreadyPendingError());
    }

    const token = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);

    const invitation = await this.invitationContract.create({
      tenantId: command.tenantId,
      tenantUUID: command.tenantUUID,
      tenantName: command.tenantName,
      invitedBy: command.inviterUserId,
      email: command.email,
      role: command.role,
      token,
      expiresAt,
    });

    return ok({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    });
  }
}
