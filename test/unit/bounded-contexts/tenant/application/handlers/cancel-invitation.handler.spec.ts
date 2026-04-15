import { CancelInvitationHandler } from '@tenant/application/commands/cancel-invitation/cancel-invitation.handler';
import { CancelInvitationCommand } from '@tenant/application/commands/cancel-invitation/cancel-invitation.command';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import {
  InvitationNotFoundError,
  InvitationAlreadyUsedError,
} from '@shared/domain/errors/invitation';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCommand(
  overrides: Partial<{
    invitationId: string;
    tenantId: number;
    requestingUserId: number;
    requestingRole: string;
  }> = {},
): CancelInvitationCommand {
  return new CancelInvitationCommand(
    overrides.invitationId ?? 'invitation-uuid-1',
    overrides.tenantId ?? 10,
    overrides.requestingUserId ?? 100,
    overrides.requestingRole ?? 'OWNER',
  );
}

function buildInvitation(
  overrides: {
    tenantId?: number;
    isAlreadyAccepted?: boolean;
  } = {},
): TenantInvitationModel {
  return {
    id: 1,
    tenantId: overrides.tenantId ?? 10,
    isAlreadyAccepted: jest.fn().mockReturnValue(overrides.isAlreadyAccepted ?? false),
  } as unknown as TenantInvitationModel;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CancelInvitationHandler', () => {
  let handler: CancelInvitationHandler;
  let invitationContract: jest.Mocked<ITenantInvitationContract>;

  beforeEach(() => {
    invitationContract = {
      findById: jest.fn(),
      findByToken: jest.fn(),
      findPendingByEmail: jest.fn(),
      markAccepted: jest.fn(),
      cancel: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<ITenantInvitationContract>;

    handler = new CancelInvitationHandler(invitationContract);
  });

  describe('Given the invitation does not exist', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        invitationContract.findById.mockResolvedValue(null);
      });

      it('Then it returns an InvitationNotFoundError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationNotFoundError);
      });
    });
  });

  describe('Given the invitation belongs to a different tenant', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        invitationContract.findById.mockResolvedValue(
          buildInvitation({ tenantId: 99 }), // different from command.tenantId=10
        );
      });

      it('Then it returns an InvitationNotFoundError', async () => {
        const result = await handler.execute(buildCommand({ tenantId: 10 }));

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationNotFoundError);
      });
    });
  });

  describe('Given the invitation is already accepted', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        invitationContract.findById.mockResolvedValue(
          buildInvitation({ tenantId: 10, isAlreadyAccepted: true }),
        );
      });

      it('Then it returns an InvitationAlreadyUsedError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationAlreadyUsedError);
      });
    });
  });

  describe('Given the invitation is valid and pending', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        invitationContract.findById.mockResolvedValue(buildInvitation({ tenantId: 10 }));
        invitationContract.cancel.mockResolvedValue(undefined);
      });

      it('Then it cancels the invitation and returns ok', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(invitationContract.cancel).toHaveBeenCalledWith('invitation-uuid-1');
      });
    });
  });
});
