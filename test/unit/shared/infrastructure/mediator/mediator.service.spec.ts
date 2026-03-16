import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ModuleRef } from '@nestjs/core';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMockModuleRef(userFacade?: object): jest.Mocked<ModuleRef> {
  return {
    get: jest.fn().mockReturnValue(userFacade ?? {}),
  } as unknown as jest.Mocked<ModuleRef>;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('MediatorService', () => {
  describe('Given a MediatorService that has not been initialized', () => {
    it('Then accessing .user throws an initialization error', () => {
      const moduleRef = buildMockModuleRef();
      const service = new MediatorService(moduleRef);

      expect(() => service.user).toThrow('MediatorService not initialized — onModuleInit has not run');
    });
  });

  describe('Given a MediatorService after onModuleInit runs', () => {
    let service: MediatorService;
    let moduleRef: jest.Mocked<ModuleRef>;
    const mockFacade = { findByUUID: jest.fn(), findUserByEmail: jest.fn() };

    beforeEach(() => {
      moduleRef = buildMockModuleRef(mockFacade);
      service = new MediatorService(moduleRef);
      service.onModuleInit();
    });

    describe('When onModuleInit is called', () => {
      it('Then it resolves the USER_FACADE token using ModuleRef with strict: false', () => {
        expect(moduleRef.get).toHaveBeenCalledWith(INJECTION_TOKENS.USER_FACADE, { strict: false });
      });
    });

    describe('When accessing .user after initialization', () => {
      it('Then it returns the resolved IUserFacade', () => {
        expect(service.user).toBe(mockFacade);
      });

      it('Then calling a facade method works through the mediator', () => {
        (mockFacade.findByUUID as jest.Mock).mockResolvedValue({ id: 1 });
        service.user.findByUUID('some-uuid');
        expect(mockFacade.findByUUID).toHaveBeenCalledWith('some-uuid');
      });
    });
  });
});
