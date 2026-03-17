import { Test, TestingModule } from '@nestjs/testing';
import { GetMyTenantHandler } from '@tenant/application/queries/get-my-tenant/get-my-tenant.handler';
import { GetMyTenantQuery } from '@tenant/application/queries/get-my-tenant/get-my-tenant.query';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { TenantNotFoundError } from '@tenant/domain/errors/tenant-not-found.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

describe('GetMyTenantHandler', () => {
  let handler: GetMyTenantHandler;
  let tenantContract: jest.Mocked<Pick<ITenantContract, 'findById'>>;

  const PERSISTED_TENANT = TenantAggregate.reconstitute({
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Mi Tienda',
    slug: 'mi-tienda',
    businessType: 'retail',
    country: 'MX',
    timezone: 'America/Mexico_City',
    status: 'active',
    ownerUserId: 42,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    archivedAt: null,
  });

  beforeEach(async () => {
    tenantContract = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMyTenantHandler,
        { provide: INJECTION_TOKENS.TENANT_CONTRACT, useValue: tenantContract },
      ],
    }).compile();

    handler = module.get<GetMyTenantHandler>(GetMyTenantHandler);
  });

  describe('Given a tenant exists with the given id', () => {
    beforeEach(() => {
      tenantContract.findById.mockResolvedValue(PERSISTED_TENANT);
    });

    describe('When the handler executes', () => {
      it('Then it returns ok with the tenant aggregate', async () => {
        const result = await handler.execute(new GetMyTenantQuery(1));
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().name).toBe('Mi Tienda');
      });
    });
  });

  describe('Given no tenant exists with the given id', () => {
    beforeEach(() => {
      tenantContract.findById.mockResolvedValue(null);
    });

    describe('When the handler executes', () => {
      it('Then it returns err with TenantNotFoundError', async () => {
        const result = await handler.execute(new GetMyTenantQuery(999));
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(TenantNotFoundError);
      });
    });
  });
});
