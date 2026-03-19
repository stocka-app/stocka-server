import { Test, TestingModule } from '@nestjs/testing';
import { GetInvitationByTokenHandler } from '@tenant/application/queries/get-invitation-by-token/get-invitation-by-token.handler';
import { GetInvitationByTokenQuery } from '@tenant/application/queries/get-invitation-by-token/get-invitation-by-token.query';
import { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import { InvitationNotFoundError } from '@onboarding/domain/errors/invitation-not-found.error';
import { InvitationExpiredError } from '@onboarding/domain/errors/invitation-expired.error';
import { InvitationAlreadyUsedError } from '@onboarding/domain/errors/invitation-already-used.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

describe('GetInvitationByTokenHandler', () => {
  let handler: GetInvitationByTokenHandler;
  let invitationContract: jest.Mocked<Pick<ITenantInvitationContract, 'findByToken'>>;

  const makeInvitation = (
    overrides: Partial<{
      acceptedAt: Date | null;
      expiresAt: Date;
    }> = {},
  ): TenantInvitationModel =>
    TenantInvitationModel.reconstitute({
      id: 'inv-uuid-1',
      tenantId: 42,
      tenantUUID: 'tenant-uuid-42',
      tenantName: 'Ferretería El Clavo',
      invitedBy: 1,
      email: 'invited@empresa.mx',
      role: 'MANAGER',
      token: 'some-token',
      acceptedAt: overrides.acceptedAt ?? null,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 72 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

  beforeEach(async () => {
    invitationContract = {
      findByToken: jest.fn().mockResolvedValue(makeInvitation()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetInvitationByTokenHandler,
        { provide: INJECTION_TOKENS.TENANT_INVITATION_CONTRACT, useValue: invitationContract },
      ],
    }).compile();

    handler = module.get<GetInvitationByTokenHandler>(GetInvitationByTokenHandler);
  });

  describe('Given the invitation token does not exist', () => {
    beforeEach(() => {
      invitationContract.findByToken.mockResolvedValue(null);
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationNotFoundError', async () => {
        const result = await handler.execute(new GetInvitationByTokenQuery('unknown-token'));
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationNotFoundError);
      });
    });
  });

  describe('Given the invitation has already been accepted', () => {
    beforeEach(() => {
      invitationContract.findByToken.mockResolvedValue(makeInvitation({ acceptedAt: new Date() }));
    });

    describe('When the handler executes', () => {
      it('Then it returns err with InvitationAlreadyUsedError', async () => {
        const result = await handler.execute(new GetInvitationByTokenQuery('some-token'));
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
        const result = await handler.execute(new GetInvitationByTokenQuery('some-token'));
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationExpiredError);
      });
    });
  });

  describe('Given a valid pending invitation', () => {
    describe('When the handler executes', () => {
      it('Then it returns ok with the invitation model', async () => {
        const result = await handler.execute(new GetInvitationByTokenQuery('some-token'));
        expect(result.isOk()).toBe(true);
        const invitation = result._unsafeUnwrap();
        expect(invitation.tenantName).toBe('Ferretería El Clavo');
        expect(invitation.email).toBe('invited@empresa.mx');
        expect(invitation.role).toBe('MANAGER');
      });
    });
  });
});
