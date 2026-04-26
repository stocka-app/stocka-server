import { GetInvitationByTokenHandler } from '@tenant/application/queries/get-invitation-by-token/get-invitation-by-token.handler';
import { GetInvitationByTokenQuery } from '@tenant/application/queries/get-invitation-by-token/get-invitation-by-token.query';
import { GetInvitationsHandler } from '@tenant/application/queries/get-invitations/get-invitations.handler';
import { GetInvitationsQuery } from '@tenant/application/queries/get-invitations/get-invitations.query';
import type { ITenantInvitationContract } from '@tenant/domain/contracts/tenant-invitation.contract';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import {
  InvitationAlreadyUsedError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from '@shared/domain/errors/invitation';

const TENANT_ID = 17;
const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';

function buildPendingInvitation(): TenantInvitationModel {
  return TenantInvitationModel.reconstitute({
    id: '019538a0-0000-7000-8000-000000000002',
    tenantId: TENANT_ID,
    tenantUUID: TENANT_UUID,
    tenantName: 'Mi Negocio',
    invitedBy: 1,
    email: 'invited@example.com',
    role: 'BUYER',
    token: 'abc-token-123',
    acceptedAt: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });
}

function buildAcceptedInvitation(): TenantInvitationModel {
  return TenantInvitationModel.reconstitute({
    id: '019538a0-0000-7000-8000-000000000003',
    tenantId: TENANT_ID,
    tenantUUID: TENANT_UUID,
    tenantName: 'Mi Negocio',
    invitedBy: 1,
    email: 'used@example.com',
    role: 'BUYER',
    token: 'used-token',
    acceptedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });
}

function buildExpiredInvitation(): TenantInvitationModel {
  return TenantInvitationModel.reconstitute({
    id: '019538a0-0000-7000-8000-000000000004',
    tenantId: TENANT_ID,
    tenantUUID: TENANT_UUID,
    tenantName: 'Mi Negocio',
    invitedBy: 1,
    email: 'expired@example.com',
    role: 'BUYER',
    token: 'old-token',
    acceptedAt: null,
    expiresAt: new Date(Date.now() - 1000),
    createdAt: new Date(),
  });
}

function makeContractStub(): jest.Mocked<ITenantInvitationContract> {
  return {
    findByToken: jest.fn(),
    findById: jest.fn(),
    findPendingByEmail: jest.fn(),
    findAllByTenantId: jest.fn(),
    create: jest.fn(),
    markAccepted: jest.fn(),
    cancel: jest.fn(),
  } as unknown as jest.Mocked<ITenantInvitationContract>;
}

// ─── GetInvitationByTokenHandler ──────────────────────────────────────────────

describe('GetInvitationByTokenHandler', () => {
  let contract: jest.Mocked<ITenantInvitationContract>;
  let handler: GetInvitationByTokenHandler;

  beforeEach(() => {
    contract = makeContractStub();
    handler = new GetInvitationByTokenHandler(contract);
  });

  describe('Given a token whose invitation does not exist', () => {
    describe('When execute is called', () => {
      it('Then it returns InvitationNotFoundError', async () => {
        contract.findByToken.mockResolvedValue(null);

        const result = await handler.execute(new GetInvitationByTokenQuery('missing'));

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationNotFoundError);
      });
    });
  });

  describe('Given a pending, valid invitation', () => {
    describe('When execute is called', () => {
      it('Then it returns the invitation', async () => {
        const invitation = buildPendingInvitation();
        contract.findByToken.mockResolvedValue(invitation);

        const result = await handler.execute(new GetInvitationByTokenQuery('abc-token-123'));

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given an already-accepted invitation', () => {
    describe('When execute is called', () => {
      it('Then it returns InvitationAlreadyUsedError', async () => {
        contract.findByToken.mockResolvedValue(buildAcceptedInvitation());

        const result = await handler.execute(new GetInvitationByTokenQuery('used-token'));

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationAlreadyUsedError);
      });
    });
  });

  describe('Given an expired invitation', () => {
    describe('When execute is called', () => {
      it('Then it returns InvitationExpiredError', async () => {
        contract.findByToken.mockResolvedValue(buildExpiredInvitation());

        const result = await handler.execute(new GetInvitationByTokenQuery('old-token'));

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationExpiredError);
      });
    });
  });
});

// ─── GetInvitationsHandler ────────────────────────────────────────────────────

describe('GetInvitationsHandler', () => {
  let contract: jest.Mocked<ITenantInvitationContract>;
  let handler: GetInvitationsHandler;

  beforeEach(() => {
    contract = makeContractStub();
    handler = new GetInvitationsHandler(contract);
  });

  describe('Given a tenant with pending invitations', () => {
    describe('When execute is called', () => {
      it('Then it returns the full list', async () => {
        contract.findAllByTenantId.mockResolvedValue([buildPendingInvitation()]);

        const result = await handler.execute(new GetInvitationsQuery(TENANT_ID));

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toHaveLength(1);
        expect(contract.findAllByTenantId).toHaveBeenCalledWith(TENANT_ID);
      });
    });
  });

  describe('Given a tenant without invitations', () => {
    describe('When execute is called', () => {
      it('Then it returns an empty array', async () => {
        contract.findAllByTenantId.mockResolvedValue([]);

        const result = await handler.execute(new GetInvitationsQuery(TENANT_ID));

        expect(result._unsafeUnwrap()).toEqual([]);
      });
    });
  });
});
