import { GetMyTenantHandler } from '@tenant/application/queries/get-my-tenant/get-my-tenant.handler';
import {
  GetMyTenantQuery,
} from '@tenant/application/queries/get-my-tenant/get-my-tenant.query';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { TenantNotFoundError } from '@tenant/domain/errors/tenant-not-found.error';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GetMyTenantHandler', () => {
  let handler: GetMyTenantHandler;
  let tenantContract: jest.Mocked<ITenantContract>;

  beforeEach(() => {
    tenantContract = {
      findById: jest.fn(),
      findByUUID: jest.fn(),
      findBySlug: jest.fn(),
      persist: jest.fn(),
    };

    handler = new GetMyTenantHandler(tenantContract);
  });

  describe('Given the tenant exists', () => {
    describe('When execute is called', () => {
      let tenant: TenantAggregate;

      beforeEach(() => {
        tenant = { id: 1, uuid: 'tenant-uuid-abc', name: 'Test Biz' } as unknown as TenantAggregate;
        tenantContract.findById.mockResolvedValue(tenant);
      });

      it('Then it returns the tenant aggregate', async () => {
        const query = new GetMyTenantQuery(1);
        const result = await handler.execute(query);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toBe(tenant);
      });
    });
  });

  describe('Given the tenant does not exist', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        tenantContract.findById.mockResolvedValue(null);
      });

      it('Then it returns a TenantNotFoundError', async () => {
        const query = new GetMyTenantQuery(99);
        const result = await handler.execute(query);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(TenantNotFoundError);
      });
    });
  });
});
