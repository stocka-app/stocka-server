import { Test, TestingModule } from '@nestjs/testing';
import { GetInvitationsHandler } from '@tenant/application/queries/get-invitations/get-invitations.handler';
import { GetInvitationsQuery } from '@tenant/application/queries/get-invitations/get-invitations.query';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

describe('GetInvitationsHandler', () => {
  let handler: GetInvitationsHandler;
  let invitationContract: jest.Mocked<Pick<ITenantInvitationContract, 'findAllByTenantId'>>;

  beforeEach(async () => {
    invitationContract = {
      findAllByTenantId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetInvitationsHandler,
        { provide: INJECTION_TOKENS.TENANT_INVITATION_CONTRACT, useValue: invitationContract },
      ],
    }).compile();

    handler = module.get<GetInvitationsHandler>(GetInvitationsHandler);
  });

  describe('Given a tenant with invitations', () => {
    beforeEach(() => {
      invitationContract.findAllByTenantId.mockResolvedValue([
        TenantInvitationModel.reconstitute({
          id: 'inv-1',
          tenantId: 42,
          tenantUUID: 'tenant-uuid-42',
          tenantName: 'Mi Tienda',
          invitedBy: 1,
          email: 'user1@empresa.mx',
          role: 'VIEWER',
          token: 'token-1',
          acceptedAt: null,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          createdAt: new Date(),
        }),
        TenantInvitationModel.reconstitute({
          id: 'inv-2',
          tenantId: 42,
          tenantUUID: 'tenant-uuid-42',
          tenantName: 'Mi Tienda',
          invitedBy: 1,
          email: 'user2@empresa.mx',
          role: 'MANAGER',
          token: 'token-2',
          acceptedAt: new Date(),
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          createdAt: new Date(),
        }),
      ]);
    });

    describe('When the handler executes', () => {
      it('Then it returns ok with the invitations list', async () => {
        const result = await handler.execute(new GetInvitationsQuery(42));
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toHaveLength(2);
      });
    });
  });

  describe('Given a tenant with no invitations', () => {
    beforeEach(() => {
      invitationContract.findAllByTenantId.mockResolvedValue([]);
    });

    describe('When the handler executes', () => {
      it('Then it returns ok with an empty array', async () => {
        const result = await handler.execute(new GetInvitationsQuery(42));
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toHaveLength(0);
      });
    });
  });
});
