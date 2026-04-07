import { AcceptInvitationHandler } from '@tenant/application/commands/accept-invitation/accept-invitation.handler';
import { AcceptInvitationCommand } from '@tenant/application/commands/accept-invitation/accept-invitation.command';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { MemberAlreadyExistsError } from '@tenant/domain/errors/member-already-exists.error';
import {
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyUsedError,
  InvitationEmailMismatchError,
} from '@shared/domain/errors/invitation';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCommand(
  overrides: Partial<{
    token: string;
    userUUID: string;
    userEmail: string;
  }> = {},
): AcceptInvitationCommand {
  return new AcceptInvitationCommand(
    overrides.token ?? 'invite-token-abc',
    overrides.userUUID ?? 'user-uuid-456',
    overrides.userEmail ?? 'invitee@example.com',
  );
}

function buildInvitation(
  overrides: {
    isAlreadyAccepted?: boolean;
    isExpired?: boolean;
    emailMatches?: boolean;
    tenantId?: number;
    tenantUUID?: string;
    tenantName?: string;
    role?: 'OWNER' | 'PARTNER' | 'MANAGER' | 'BUYER' | 'WAREHOUSE_KEEPER' | 'SALES_REP' | 'VIEWER';
  } = {},
): TenantInvitationModel {
  return {
    id: 1,
    tenantId: overrides.tenantId ?? 10,
    tenantUUID: overrides.tenantUUID ?? 'tenant-uuid-xyz',
    tenantName: overrides.tenantName ?? 'Test Biz',
    role: overrides.role ?? 'VIEWER',
    email: 'invitee@example.com',
    isAlreadyAccepted: jest.fn().mockReturnValue(overrides.isAlreadyAccepted ?? false),
    isExpired: jest.fn().mockReturnValue(overrides.isExpired ?? false),
    emailMatches: jest.fn().mockReturnValue(overrides.emailMatches ?? true),
  } as unknown as TenantInvitationModel;
}

function buildUserAggregate(id?: number): UserAggregate {
  if (id === undefined) return { uuid: 'user-uuid-456' } as unknown as UserAggregate;
  return { id, uuid: 'user-uuid-456' } as unknown as UserAggregate;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AcceptInvitationHandler', () => {
  let handler: AcceptInvitationHandler;
  let invitationContract: jest.Mocked<ITenantInvitationContract>;
  let memberContract: jest.Mocked<ITenantMemberContract>;
  let uow: jest.Mocked<IUnitOfWork>;
  let mediator: jest.Mocked<MediatorService>;

  beforeEach(() => {
    invitationContract = {
      findByToken: jest.fn(),
      markAccepted: jest.fn(),
      findPendingByEmail: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<ITenantInvitationContract>;

    memberContract = {
      findActiveByUserUUID: jest.fn(),
      findAllByTenantId: jest.fn(),
      findByTenantAndUserId: jest.fn(),
      persist: jest.fn(),
    };

    uow = {
      begin: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
    } as unknown as jest.Mocked<IUnitOfWork>;

    mediator = {
      user: {
        findByUUID: jest.fn(),
      },
    } as unknown as jest.Mocked<MediatorService>;

    handler = new AcceptInvitationHandler(invitationContract, memberContract, uow, mediator);
  });

  describe('Given the invitation token does not exist', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        invitationContract.findByToken.mockResolvedValue(null);
      });

      it('Then it returns an InvitationNotFoundError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationNotFoundError);
      });
    });
  });

  describe('Given the invitation is already accepted', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        invitationContract.findByToken.mockResolvedValue(
          buildInvitation({ isAlreadyAccepted: true }),
        );
      });

      it('Then it returns an InvitationAlreadyUsedError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationAlreadyUsedError);
      });
    });
  });

  describe('Given the invitation is expired', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        invitationContract.findByToken.mockResolvedValue(buildInvitation({ isExpired: true }));
      });

      it('Then it returns an InvitationExpiredError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationExpiredError);
      });
    });
  });

  describe('Given the invitation email does not match the user email', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        invitationContract.findByToken.mockResolvedValue(buildInvitation({ emailMatches: false }));
      });

      it('Then it returns an InvitationEmailMismatchError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationEmailMismatchError);
      });
    });
  });

  describe('Given the user is already a member of the same tenant', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        invitationContract.findByToken.mockResolvedValue(buildInvitation({ tenantId: 10 }));
        memberContract.findActiveByUserUUID.mockResolvedValue({
          tenantId: 10,
          isActive: jest.fn().mockReturnValue(true),
        } as unknown as ReturnType<typeof memberContract.findActiveByUserUUID> extends Promise<
          infer T
        >
          ? T
          : never);
      });

      it('Then it returns a MemberAlreadyExistsError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(MemberAlreadyExistsError);
      });
    });
  });

  describe('Given the invitation is valid and the user exists', () => {
    describe('When the transaction succeeds', () => {
      beforeEach(() => {
        invitationContract.findByToken.mockResolvedValue(
          buildInvitation({ tenantId: 10, tenantUUID: 'tenant-uuid-xyz', role: 'VIEWER' }),
        );
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(buildUserAggregate(42));
        memberContract.persist.mockResolvedValue(
          {} as ReturnType<typeof memberContract.persist> extends Promise<infer T> ? T : never,
        );
        invitationContract.markAccepted.mockResolvedValue(undefined);
      });

      it('Then it returns success with the tenant and role info', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        const data = result._unsafeUnwrap();
        expect(data.tenantUUID).toBe('tenant-uuid-xyz');
        expect(data.role).toBe('VIEWER');
      });
    });

    describe('When the transaction throws a DomainException', () => {
      class TestDomainException extends DomainException {
        constructor() {
          super('TEST_ERROR', 'test domain error');
        }
      }

      beforeEach(() => {
        invitationContract.findByToken.mockResolvedValue(buildInvitation({ tenantId: 10 }));
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(buildUserAggregate(42));
        memberContract.persist.mockRejectedValue(new TestDomainException());
      });

      it('Then it rethrows the domain exception', async () => {
        await expect(handler.execute(buildCommand())).rejects.toThrow(TestDomainException);
      });
    });

    describe('When the transaction throws a non-domain error', () => {
      beforeEach(() => {
        invitationContract.findByToken.mockResolvedValue(buildInvitation({ tenantId: 10 }));
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(buildUserAggregate(42));
        memberContract.persist.mockRejectedValue(new Error('Network error'));
      });

      it('Then it rethrows the error', async () => {
        await expect(handler.execute(buildCommand())).rejects.toThrow('Network error');
      });
    });
  });
});
