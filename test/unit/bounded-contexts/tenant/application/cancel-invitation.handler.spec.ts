import { Test, TestingModule } from '@nestjs/testing';
import { CancelInvitationHandler } from '@tenant/application/commands/cancel-invitation/cancel-invitation.handler';
import { CancelInvitationCommand } from '@tenant/application/commands/cancel-invitation/cancel-invitation.command';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import { InvitationNotFoundError } from '@onboarding/domain/errors/invitation-not-found.error';
import { InvitationAlreadyUsedError } from '@onboarding/domain/errors/invitation-already-used.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

describe('CancelInvitationHandler', () => {
  let handler: CancelInvitationHandler;
  let invitationContract: jest.Mocked<Pick<ITenantInvitationContract, 'findById' | 'cancel'>>;

  const VALID_COMMAND = new CancelInvitationCommand('inv-uuid-1', 42, 1, 'OWNER');

  const makeInvitation = (
    overrides: Partial<{
      acceptedAt: Date | null;
      tenantId: number;
    }> = {},
  ): TenantInvitationModel =>
    TenantInvitationModel.reconstitute({
      id: 'inv-uuid-1',
      tenantId: overrides.tenantId ?? 42,
      tenantUUID: 'tenant-uuid-42',
      tenantName: 'Ferretería El Clavo',
      invitedBy: 1,
      email: 'invited@empresa.mx',
      role: 'MANAGER',
      token: 'some-token',
      acceptedAt: overrides.acceptedAt ?? null,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

  beforeEach(async () => {
    invitationContract = {
      findById: jest.fn().mockResolvedValue(makeInvitation()),
      cancel: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelInvitationHandler,
        { provide: INJECTION_TOKENS.TENANT_INVITATION_CONTRACT, useValue: invitationContract },
      ],
    }).compile();

    handler = module.get<CancelInvitationHandler>(CancelInvitationHandler);
  });

  describe('Given the invitation does not exist', () => {
    beforeEach(() => {
      invitationContract.findById.mockResolvedValue(null);
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationNotFoundError', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationNotFoundError);
      });
    });
  });

  describe('Given the invitation belongs to a different tenant', () => {
    beforeEach(() => {
      invitationContract.findById.mockResolvedValue(makeInvitation({ tenantId: 999 }));
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationNotFoundError for security', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationNotFoundError);
      });
    });
  });

  describe('Given the invitation has already been accepted', () => {
    beforeEach(() => {
      invitationContract.findById.mockResolvedValue(makeInvitation({ acceptedAt: new Date() }));
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationAlreadyUsedError', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationAlreadyUsedError);
      });

      it('Then it does not call cancel', async () => {
        await handler.execute(VALID_COMMAND);
        expect(invitationContract.cancel).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a valid pending invitation in the same tenant', () => {
    describe('When the handler executes', () => {
      it('Then it returns ok with undefined', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toBeUndefined();
      });

      it('Then it calls cancel with the invitation id', async () => {
        await handler.execute(VALID_COMMAND);
        expect(invitationContract.cancel).toHaveBeenCalledWith('inv-uuid-1');
      });
    });
  });
});
