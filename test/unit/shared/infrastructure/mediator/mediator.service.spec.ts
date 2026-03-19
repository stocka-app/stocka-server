import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ModuleRef } from '@nestjs/core';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMockModuleRef(facades?: Record<string, object>): jest.Mocked<ModuleRef> {
  return {
    get: jest.fn().mockImplementation((token: string) => {
      if (token === INJECTION_TOKENS.USER_FACADE) return facades?.user ?? {};
      if (token === INJECTION_TOKENS.TENANT_FACADE) return facades?.tenant ?? {};
      return {};
    }),
  } as unknown as jest.Mocked<ModuleRef>;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('MediatorService', () => {
  describe('Given a MediatorService that has not been initialized', () => {
    it('Then accessing .user throws an initialization error', () => {
      const moduleRef = buildMockModuleRef();
      const service = new MediatorService(moduleRef);

      expect(() => service.user).toThrow(
        'MediatorService not initialized — onModuleInit has not run',
      );
    });

    it('Then accessing .tenant throws an initialization error', () => {
      const moduleRef = buildMockModuleRef();
      const service = new MediatorService(moduleRef);

      expect(() => service.tenant).toThrow(
        'MediatorService not initialized — onModuleInit has not run',
      );
    });
  });

  describe('Given a MediatorService after onModuleInit runs', () => {
    let service: MediatorService;
    let moduleRef: jest.Mocked<ModuleRef>;
    const mockUserFacade = { findByUUID: jest.fn(), findUserByEmail: jest.fn() };
    const mockTenantFacade = {
      getActiveMembership: jest.fn(),
      getMembershipContext: jest.fn(),
    };

    beforeEach(() => {
      moduleRef = buildMockModuleRef({ user: mockUserFacade, tenant: mockTenantFacade });
      service = new MediatorService(moduleRef);
      service.onModuleInit();
    });

    describe('When onModuleInit is called', () => {
      it('Then it resolves the USER_FACADE token using ModuleRef with strict: false', () => {
        expect(moduleRef.get).toHaveBeenCalledWith(INJECTION_TOKENS.USER_FACADE, {
          strict: false,
        });
      });

      it('Then it resolves the TENANT_FACADE token using ModuleRef with strict: false', () => {
        expect(moduleRef.get).toHaveBeenCalledWith(INJECTION_TOKENS.TENANT_FACADE, {
          strict: false,
        });
      });
    });

    describe('When accessing .user after initialization', () => {
      it('Then it returns the resolved IUserFacade', () => {
        expect(service.user).toBe(mockUserFacade);
      });

      it('Then calling a facade method works through the mediator', async () => {
        mockUserFacade.findByUUID.mockResolvedValue({ id: 1 });
        await service.user.findByUUID('some-uuid');
        expect(mockUserFacade.findByUUID).toHaveBeenCalledWith('some-uuid');
      });
    });

    describe('When accessing .tenant after initialization', () => {
      it('Then it returns the resolved ITenantFacade', () => {
        expect(service.tenant).toBe(mockTenantFacade);
      });

      it('Then calling a facade method works through the mediator', async () => {
        mockTenantFacade.getActiveMembership.mockResolvedValue({
          tenantUUID: 'uuid',
          role: 'OWNER',
        });
        await service.tenant.getActiveMembership('user-uuid');
        expect(mockTenantFacade.getActiveMembership).toHaveBeenCalledWith('user-uuid');
      });
    });
  });

  describe('Given a MediatorService initialized in a context without TenantModule (e.g. isolated e2e worker)', () => {
    let service: MediatorService;

    beforeEach(() => {
      const moduleRef = {
        get: jest.fn().mockImplementation((token: string) => {
          if (token === INJECTION_TOKENS.USER_FACADE) return {};
          throw new Error('Nest could not find TenantFacade element');
        }),
      } as unknown as jest.Mocked<ModuleRef>;
      service = new MediatorService(moduleRef);
      service.onModuleInit();
    });

    it('Then getActiveMembership returns null without crashing', async () => {
      const result = await service.tenant.getActiveMembership('user-uuid');
      expect(result).toBeNull();
    });

    it('Then getMembershipContext returns null without crashing', async () => {
      const result = await service.tenant.getMembershipContext('user-uuid');
      expect(result).toBeNull();
    });

    it('Then createTenantForUser throws a meaningful error', async () => {
      await expect(
        service.tenant.createTenantForUser({
          userUUID: 'u1',
          userId: 1,
          name: 'T',
          businessType: 'retail',
        }),
      ).rejects.toThrow('TenantFacade not available in this context');
    });
  });
});
