import { Test, TestingModule } from '@nestjs/testing';
import { AcceptInvitationHandler } from '@tenant/application/commands/accept-invitation/accept-invitation.handler';
import { AcceptInvitationCommand } from '@tenant/application/commands/accept-invitation/accept-invitation.command';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { MemberAlreadyExistsError } from '@tenant/domain/errors/member-already-exists.error';
import { InvitationNotFoundError } from '@onboarding/domain/errors/invitation-not-found.error';
import { InvitationExpiredError } from '@onboarding/domain/errors/invitation-expired.error';
import { InvitationAlreadyUsedError } from '@onboarding/domain/errors/invitation-already-used.error';
import { InvitationEmailMismatchError } from '@onboarding/domain/errors/invitation-email-mismatch.error';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('AcceptInvitationHandler', () => {
  let handler: AcceptInvitationHandler;
  let invitationContract: jest.Mocked<
    Pick<ITenantInvitationContract, 'findByToken' | 'markAccepted'>
  >;
  let memberContract: jest.Mocked<Pick<ITenantMemberContract, 'findActiveByUserUUID' | 'persist'>>;
  let uow: jest.Mocked<
    Pick<IUnitOfWork, 'begin' | 'commit' | 'rollback' | 'isActive' | 'getManager'>
  >;
  let mediator: { user: { findByUUID: jest.Mock } };

  const USER_UUID = '019538a0-0000-7000-8000-000000000001';
  const USER_EMAIL = 'invited@empresa.mx';
  const VALID_COMMAND = new AcceptInvitationCommand('valid-token', USER_UUID, USER_EMAIL);

  const makeInvitation = (
    overrides: Partial<{
      acceptedAt: Date | null;
      expiresAt: Date;
      email: string;
      tenantId: number;
    }> = {},
  ): TenantInvitationModel =>
    TenantInvitationModel.reconstitute({
      id: 'inv-uuid-1',
      tenantId: overrides.tenantId ?? 42,
      tenantUUID: 'tenant-uuid-42',
      tenantName: 'Ferretería El Clavo',
      invitedBy: 1,
      email: overrides.email ?? USER_EMAIL,
      role: 'MANAGER',
      token: 'valid-token',
      acceptedAt: overrides.acceptedAt ?? null,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 72 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

  beforeEach(async () => {
    invitationContract = {
      findByToken: jest.fn().mockResolvedValue(makeInvitation()),
      markAccepted: jest.fn().mockResolvedValue(undefined),
    };

    memberContract = {
      findActiveByUserUUID: jest.fn().mockResolvedValue(null),
      persist: jest.fn().mockImplementation((m) => Promise.resolve(m)),
    };

    uow = {
      begin: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      isActive: jest.fn().mockReturnValue(false),
      getManager: jest.fn(),
    };

    mediator = {
      user: {
        findByUUID: jest.fn().mockResolvedValue(UserMother.create({ id: 99, uuid: USER_UUID })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptInvitationHandler,
        { provide: INJECTION_TOKENS.TENANT_INVITATION_CONTRACT, useValue: invitationContract },
        { provide: INJECTION_TOKENS.TENANT_MEMBER_CONTRACT, useValue: memberContract },
        { provide: INJECTION_TOKENS.UNIT_OF_WORK, useValue: uow },
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    handler = module.get<AcceptInvitationHandler>(AcceptInvitationHandler);
  });

  describe('Given the invitation token does not exist', () => {
    beforeEach(() => {
      invitationContract.findByToken.mockResolvedValue(null);
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationNotFoundError', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationNotFoundError);
      });

      it('Then the UoW transaction is never opened', async () => {
        await handler.execute(VALID_COMMAND);
        expect(uow.begin).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the invitation has already been accepted', () => {
    beforeEach(() => {
      invitationContract.findByToken.mockResolvedValue(makeInvitation({ acceptedAt: new Date() }));
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationAlreadyUsedError', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationAlreadyUsedError);
      });
    });
  });

  describe('Given the invitation has expired', () => {
    beforeEach(() => {
      invitationContract.findByToken.mockResolvedValue(
        makeInvitation({ expiresAt: new Date(Date.now() - 1000) }),
      );
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationExpiredError', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationExpiredError);
      });
    });
  });

  describe('Given the invitation email does not match the user email', () => {
    beforeEach(() => {
      invitationContract.findByToken.mockResolvedValue(
        makeInvitation({ email: 'other@empresa.mx' }),
      );
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationEmailMismatchError', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationEmailMismatchError);
      });
    });
  });

  describe('Given the user is already a member of the same tenant', () => {
    beforeEach(() => {
      memberContract.findActiveByUserUUID.mockResolvedValue(
        TenantMemberModel.create({
          tenantId: 42,
          userId: 99,
          userUUID: USER_UUID,
          role: 'VIEWER',
        }),
      );
    });

    describe('When the handler executes', () => {
      it('Then it returns err with MemberAlreadyExistsError', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(MemberAlreadyExistsError);
      });
    });
  });

  describe('Given the user aggregate cannot be resolved', () => {
    beforeEach(() => {
      mediator.user.findByUUID.mockResolvedValue(null);
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationNotFoundError', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationNotFoundError);
      });
    });
  });

  describe('Given all validations pass', () => {
    describe('When the handler executes', () => {
      it('Then it returns ok with tenant and role details', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isOk()).toBe(true);
        const data = result._unsafeUnwrap();
        expect(data.tenantUUID).toBe('tenant-uuid-42');
        expect(data.tenantName).toBe('Ferretería El Clavo');
        expect(data.role).toBe('MANAGER');
        expect(data.joinedAt).toBeInstanceOf(Date);
      });

      it('Then a member is persisted and the invitation is marked accepted', async () => {
        await handler.execute(VALID_COMMAND);
        expect(memberContract.persist).toHaveBeenCalledTimes(1);
        expect(invitationContract.markAccepted).toHaveBeenCalledWith('inv-uuid-1');
      });

      it('Then the UoW transaction is opened and committed', async () => {
        await handler.execute(VALID_COMMAND);
        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the persist call throws an unexpected error inside the transaction', () => {
    beforeEach(() => {
      memberContract.persist.mockRejectedValue(new Error('DB connection lost'));
    });

    describe('When the handler executes', () => {
      it('Then it rolls back the UoW and re-throws the error', async () => {
        await expect(handler.execute(VALID_COMMAND)).rejects.toThrow('DB connection lost');
        expect(uow.rollback).toHaveBeenCalledTimes(1);
      });
    });
  });
});
