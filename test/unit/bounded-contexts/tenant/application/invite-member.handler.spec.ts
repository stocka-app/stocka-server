import { Test, TestingModule } from '@nestjs/testing';
import { InviteMemberHandler } from '@tenant/application/commands/invite-member/invite-member.handler';
import { InviteMemberCommand } from '@tenant/application/commands/invite-member/invite-member.command';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import { InvitationAlreadyPendingError } from '@tenant/domain/errors/invitation-already-pending.error';
import { InsufficientPermissionsError } from '@tenant/domain/errors/insufficient-permissions.error';
import { RoleHierarchyService } from '@tenant/domain/services/role-hierarchy.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

const ASSIGNABLE_ROLES: Record<string, string[]> = {
  OWNER: ['PARTNER', 'MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'],
  PARTNER: ['MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'],
  MANAGER: ['BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'],
};

describe('InviteMemberHandler', () => {
  let handler: InviteMemberHandler;
  let invitationContract: jest.Mocked<
    Pick<ITenantInvitationContract, 'findPendingByEmail' | 'create'>
  >;

  const VALID_COMMAND = new InviteMemberCommand(
    1,
    'tenant-uuid-1',
    'Mi Tienda',
    42,
    'OWNER',
    'newmember@empresa.mx',
    'VIEWER',
  );

  beforeEach(async () => {
    invitationContract = {
      findPendingByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((props) =>
        Promise.resolve(
          TenantInvitationModel.reconstitute({
            id: 'new-inv-uuid',
            tenantId: props.tenantId,
            tenantUUID: props.tenantUUID,
            tenantName: props.tenantName,
            invitedBy: props.invitedBy,
            email: props.email,
            role: props.role,
            token: props.token,
            acceptedAt: null,
            expiresAt: props.expiresAt,
            createdAt: new Date(),
          }),
        ),
      ),
    };

    const mockRbacPort = {
      getRoleActions: jest.fn(),
      getActionTierRequirements: jest.fn(),
      getTierNumericLimits: jest.fn(),
      getTierOrder: jest.fn(),
      getActionLimitChecks: jest.fn(),
      getAssignableRoles: jest
        .fn()
        .mockImplementation((role: string) => Promise.resolve(ASSIGNABLE_ROLES[role] ?? [])),
      getUserGrants: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteMemberHandler,
        RoleHierarchyService,
        {
          provide: INJECTION_TOKENS.TENANT_INVITATION_CONTRACT,
          useValue: invitationContract,
        },
        {
          provide: INJECTION_TOKENS.RBAC_POLICY_PORT,
          useValue: mockRbacPort,
        },
      ],
    }).compile();

    handler = module.get<InviteMemberHandler>(InviteMemberHandler);
  });

  describe('Given the inviter has a role that cannot assign the target role', () => {
    describe('When the handler executes', () => {
      it('Then it returns err with InsufficientPermissionsError', async () => {
        const command = new InviteMemberCommand(
          1,
          'tenant-uuid-1',
          'Mi Tienda',
          42,
          'VIEWER',
          'newmember@empresa.mx',
          'MANAGER',
        );
        const result = await handler.execute(command);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InsufficientPermissionsError);
      });

      it('Then it does not check for pending invitations', async () => {
        const command = new InviteMemberCommand(
          1,
          'tenant-uuid-1',
          'Mi Tienda',
          42,
          'VIEWER',
          'newmember@empresa.mx',
          'MANAGER',
        );
        await handler.execute(command);
        expect(invitationContract.findPendingByEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a pending invitation already exists for the email in this tenant', () => {
    beforeEach(() => {
      invitationContract.findPendingByEmail.mockResolvedValue(
        TenantInvitationModel.reconstitute({
          id: 'existing-inv',
          tenantId: 1,
          tenantUUID: 'tenant-uuid-1',
          tenantName: 'Mi Tienda',
          invitedBy: 42,
          email: 'newmember@empresa.mx',
          role: 'VIEWER',
          token: 'existing-token',
          acceptedAt: null,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          createdAt: new Date(),
        }),
      );
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationAlreadyPendingError', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationAlreadyPendingError);
      });

      it('Then it does not create a new invitation', async () => {
        await handler.execute(VALID_COMMAND);
        expect(invitationContract.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given all business rules pass', () => {
    describe('When the handler executes', () => {
      it('Then it returns ok with the invitation details', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isOk()).toBe(true);
        const data = result._unsafeUnwrap();
        expect(data.id).toBe('new-inv-uuid');
        expect(data.email).toBe('newmember@empresa.mx');
        expect(data.role).toBe('VIEWER');
        expect(data.expiresAt).toBeInstanceOf(Date);
        expect(data.createdAt).toBeInstanceOf(Date);
      });

      it('Then it creates the invitation with a token and expiration', async () => {
        await handler.execute(VALID_COMMAND);
        expect(invitationContract.create).toHaveBeenCalledTimes(1);
        const createArgs = invitationContract.create.mock.calls[0][0];
        expect(createArgs.tenantId).toBe(1);
        expect(createArgs.tenantUUID).toBe('tenant-uuid-1');
        expect(createArgs.tenantName).toBe('Mi Tienda');
        expect(createArgs.invitedBy).toBe(42);
        expect(createArgs.email).toBe('newmember@empresa.mx');
        expect(createArgs.role).toBe('VIEWER');
        expect(createArgs.token).toHaveLength(96);
        expect(createArgs.expiresAt.getTime()).toBeGreaterThan(Date.now());
      });
    });
  });

  describe('Given a PARTNER inviter assigning MANAGER', () => {
    describe('When the handler executes', () => {
      it('Then it succeeds because PARTNER can assign MANAGER', async () => {
        const command = new InviteMemberCommand(
          1,
          'tenant-uuid-1',
          'Mi Tienda',
          42,
          'PARTNER',
          'newmember@empresa.mx',
          'MANAGER',
        );
        const result = await handler.execute(command);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given a MANAGER inviter assigning OWNER', () => {
    describe('When the handler executes', () => {
      it('Then it fails with InsufficientPermissionsError', async () => {
        const command = new InviteMemberCommand(
          1,
          'tenant-uuid-1',
          'Mi Tienda',
          42,
          'MANAGER',
          'newmember@empresa.mx',
          'OWNER',
        );
        const result = await handler.execute(command);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InsufficientPermissionsError);
      });
    });
  });
});
