import { InviteMemberHandler } from '@tenant/application/commands/invite-member/invite-member.handler';
import { InviteMemberCommand } from '@tenant/application/commands/invite-member/invite-member.command';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { RoleHierarchyService } from '@authorization/domain/services/role-hierarchy.service';
import { InvitationAlreadyPendingError } from '@tenant/domain/errors/invitation-already-pending.error';
import { InsufficientPermissionsError } from '@tenant/domain/errors/insufficient-permissions.error';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCommand(overrides: Partial<InviteMemberCommand> = {}): InviteMemberCommand {
  return {
    tenantId: 1,
    tenantUUID: 'tenant-uuid-123',
    tenantName: 'Test Tenant',
    inviterUserId: 42,
    inviterRole: 'OWNER',
    email: 'invite@example.com',
    role: 'VIEWER',
    ...overrides,
  } as InviteMemberCommand;
}

function buildInvitation(): TenantInvitationModel {
  return {
    id: 'invitation-uuid',
    email: 'invite@example.com',
    role: 'VIEWER',
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    createdAt: new Date(),
  } as unknown as TenantInvitationModel;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('InviteMemberHandler', () => {
  let handler: InviteMemberHandler;
  let invitationContract: jest.Mocked<ITenantInvitationContract>;
  let roleHierarchyService: jest.Mocked<RoleHierarchyService>;

  beforeEach(() => {
    invitationContract = {
      findPendingByEmail: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<ITenantInvitationContract>;

    roleHierarchyService = {
      canAssignRole: jest.fn(),
    } as unknown as jest.Mocked<RoleHierarchyService>;

    handler = new InviteMemberHandler(invitationContract, roleHierarchyService);
  });

  describe('Given the inviter does not have permission to assign the target role', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        roleHierarchyService.canAssignRole.mockResolvedValue(false);
      });

      it('Then it returns an err with InsufficientPermissionsError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InsufficientPermissionsError);
        expect(invitationContract.findPendingByEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given an invitation to this email is already pending', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        roleHierarchyService.canAssignRole.mockResolvedValue(true);
        invitationContract.findPendingByEmail.mockResolvedValue(buildInvitation());
      });

      it('Then it returns an err with InvitationAlreadyPendingError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationAlreadyPendingError);
        expect(invitationContract.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the inviter has permission and no pending invitation exists', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        roleHierarchyService.canAssignRole.mockResolvedValue(true);
        invitationContract.findPendingByEmail.mockResolvedValue(null);
        invitationContract.create.mockResolvedValue(buildInvitation());
      });

      it('Then it returns ok with the new invitation details', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        const invitation = result._unsafeUnwrap();
        expect(invitation.email).toBe('invite@example.com');
        expect(invitation.role).toBe('VIEWER');
      });

      it('Then it creates the invitation with the correct tenant context', async () => {
        await handler.execute(buildCommand());

        expect(invitationContract.create).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: 1,
            tenantUUID: 'tenant-uuid-123',
            email: 'invite@example.com',
            role: 'VIEWER',
          }),
        );
      });
    });
  });
});
