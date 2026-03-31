import { Logger } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { SecurityBootstrapValidator } from '@common/security/security-bootstrap.validator';

// Mock the SecurityRegistry to control which entries exist
jest.mock('@common/security/security-registry', () => ({
  SecurityRegistry: {
    'GET /': { public: true },
    'GET /health': { public: true },
    'GET /orphan/route': { public: true },
  },
}));

describe('SecurityBootstrapValidator', () => {
  let validator: SecurityBootstrapValidator;
  let discoveryService: jest.Mocked<DiscoveryService>;
  let metadataScanner: jest.Mocked<MetadataScanner>;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(() => {
    discoveryService = {
      getControllers: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<DiscoveryService>;

    metadataScanner = {
      scanFromPrototype: jest.fn(),
    } as unknown as jest.Mocked<MetadataScanner>;

    validator = new SecurityBootstrapValidator(discoveryService, metadataScanner);

    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
    loggerLogSpy.mockRestore();
  });

  describe('Given all registry entries have matching controller routes', () => {
    beforeEach(() => {
      const rootController = { constructor: class AppController {} };
      Reflect.defineMetadata('path', '', rootController.constructor);

      const healthController = { constructor: class HealthController {} };
      Reflect.defineMetadata('path', 'health', healthController.constructor);

      const orphanController = { constructor: class OrphanController {} };
      Reflect.defineMetadata('path', 'orphan', orphanController.constructor);

      discoveryService.getControllers.mockReturnValue([
        { instance: rootController },
        { instance: healthController },
        { instance: orphanController },
      ] as unknown as ReturnType<DiscoveryService['getControllers']>);

      metadataScanner.scanFromPrototype.mockImplementation(
        (_instance: unknown, _proto: object | null, callback: (key: string) => unknown) => {
          const proto = _proto as Record<string, unknown>;
          // Simulate scanning — call callback for methods with metadata
          if (proto === Object.getPrototypeOf(rootController)) {
            const handler = (): void => {};
            Reflect.defineMetadata('path', '/', handler);
            Reflect.defineMetadata('method', 0, handler); // GET = 0
            proto.getRoot = handler;
            callback('getRoot');
          }
          if (proto === Object.getPrototypeOf(healthController)) {
            const handler = (): void => {};
            Reflect.defineMetadata('path', '', handler);
            Reflect.defineMetadata('method', 0, handler);
            proto.check = handler;
            callback('check');
          }
          if (proto === Object.getPrototypeOf(orphanController)) {
            const handler = (): void => {};
            Reflect.defineMetadata('path', 'route', handler);
            Reflect.defineMetadata('method', 0, handler);
            proto.handle = handler;
            callback('handle');
          }
          return [] as unknown[];
        },
      );
    });

    describe('When the application bootstraps', () => {
      it('Then no warnings are logged about orphan entries', () => {
        validator.onApplicationBootstrap();

        expect(loggerWarnSpy).not.toHaveBeenCalled();
      });

      it('Then it logs the total number of routes scanned and registry entries', () => {
        validator.onApplicationBootstrap();

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\d+ routes scanned, 3 registry entries/),
        );
      });
    });
  });

  describe('Given the registry has an entry that does not match any controller route', () => {
    beforeEach(() => {
      const rootController = { constructor: class AppController {} };
      Reflect.defineMetadata('path', '', rootController.constructor);

      const healthController = { constructor: class HealthController {} };
      Reflect.defineMetadata('path', 'health', healthController.constructor);

      discoveryService.getControllers.mockReturnValue([
        { instance: rootController },
        { instance: healthController },
      ] as unknown as ReturnType<DiscoveryService['getControllers']>);

      metadataScanner.scanFromPrototype.mockImplementation(
        (_instance: unknown, _proto: object | null, callback: (key: string) => unknown) => {
          const proto = _proto as Record<string, unknown>;
          if (proto === Object.getPrototypeOf(rootController)) {
            const handler = (): void => {};
            Reflect.defineMetadata('path', '/', handler);
            Reflect.defineMetadata('method', 0, handler);
            proto.getRoot = handler;
            callback('getRoot');
          }
          if (proto === Object.getPrototypeOf(healthController)) {
            const handler = (): void => {};
            Reflect.defineMetadata('path', '', handler);
            Reflect.defineMetadata('method', 0, handler);
            proto.check = handler;
            callback('check');
          }
          return [] as unknown[];
        },
      );
    });

    describe('When the application bootstraps', () => {
      it('Then it logs a warning for the orphan registry entry', () => {
        validator.onApplicationBootstrap();

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('orphan entry: "GET /orphan/route"'),
        );
      });
    });
  });

  describe('Given no controllers are discovered (empty application)', () => {
    beforeEach(() => {
      discoveryService.getControllers.mockReturnValue([]);
    });

    describe('When the application bootstraps', () => {
      it('Then it warns about all registry entries being orphans', () => {
        validator.onApplicationBootstrap();

        expect(loggerWarnSpy).toHaveBeenCalledTimes(3);
      });

      it('Then it logs 0 routes scanned', () => {
        validator.onApplicationBootstrap();

        expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('0 routes scanned'));
      });
    });
  });

  describe('Given a controller wrapper with no instance', () => {
    beforeEach(() => {
      discoveryService.getControllers.mockReturnValue([{ instance: null }] as unknown as ReturnType<
        DiscoveryService['getControllers']
      >);
    });

    describe('When the application bootstraps', () => {
      it('Then it skips the null instance gracefully', () => {
        expect(() => validator.onApplicationBootstrap()).not.toThrow();
      });
    });
  });

  describe('Given a controller whose constructor has no path metadata (undefined)', () => {
    beforeEach(() => {
      const controller = { constructor: class NoPathController {} };
      // Intentionally NOT setting 'path' metadata on constructor → falls back to ''

      discoveryService.getControllers.mockReturnValue([
        { instance: controller },
      ] as unknown as ReturnType<DiscoveryService['getControllers']>);

      metadataScanner.scanFromPrototype.mockImplementation(
        (_instance: unknown, _proto: object | null, callback: (key: string) => unknown) => {
          const proto = _proto as Record<string, unknown>;
          const handler = (): void => {};
          Reflect.defineMetadata('path', 'route', handler);
          Reflect.defineMetadata('method', 0, handler); // GET
          proto.handle = handler;
          callback('handle');
          return [] as unknown[];
        },
      );
    });

    describe('When the application bootstraps', () => {
      it('Then it uses empty string as controllerPath without crashing', () => {
        expect(() => validator.onApplicationBootstrap()).not.toThrow();
      });
    });
  });

  describe('Given a route handler that has no path metadata on the handler function', () => {
    beforeEach(() => {
      const controller = { constructor: class TestController {} };
      Reflect.defineMetadata('path', 'test', controller.constructor);

      discoveryService.getControllers.mockReturnValue([
        { instance: controller },
      ] as unknown as ReturnType<DiscoveryService['getControllers']>);

      metadataScanner.scanFromPrototype.mockImplementation(
        (_instance: unknown, _proto: object | null, callback: (key: string) => unknown) => {
          const proto = _proto as Record<string, unknown>;
          const handler = (): void => {};
          // handler path metadata intentionally NOT set → falls back to ''
          Reflect.defineMetadata('method', 0, handler); // GET
          proto.handle = handler;
          callback('handle');
          return [] as unknown[];
        },
      );
    });

    describe('When the application bootstraps', () => {
      it('Then it uses empty string as handlerPath without crashing', () => {
        expect(() => validator.onApplicationBootstrap()).not.toThrow();
      });
    });
  });

  describe('Given a controller whose prototype exposes a non-function property', () => {
    beforeEach(() => {
      const controller = { constructor: class TestController {}, someProperty: 'not-a-function' };
      Reflect.defineMetadata('path', 'test', controller.constructor);

      discoveryService.getControllers.mockReturnValue([
        { instance: controller },
      ] as unknown as ReturnType<DiscoveryService['getControllers']>);

      metadataScanner.scanFromPrototype.mockImplementation(
        (_instance: unknown, _proto: object | null, callback: (key: string) => unknown) => {
          callback('someProperty');
          return [] as unknown[];
        },
      );
    });

    describe('When the application bootstraps', () => {
      it('Then it skips the non-function property without crashing', () => {
        expect(() => validator.onApplicationBootstrap()).not.toThrow();
      });
    });
  });

  describe('Given a controller method that has no HTTP method metadata (not a route handler)', () => {
    beforeEach(() => {
      const controller = { constructor: class TestController {} };
      Reflect.defineMetadata('path', 'test', controller.constructor);

      discoveryService.getControllers.mockReturnValue([
        { instance: controller },
      ] as unknown as ReturnType<DiscoveryService['getControllers']>);

      metadataScanner.scanFromPrototype.mockImplementation(
        (_instance: unknown, _proto: object | null, callback: (key: string) => unknown) => {
          const proto = _proto as Record<string, unknown>;
          const helperFn = (): void => {};
          Reflect.defineMetadata('path', 'helper', helperFn);
          // method metadata intentionally NOT set — this is not an HTTP handler
          proto.helperMethod = helperFn;
          callback('helperMethod');
          return [] as unknown[];
        },
      );
    });

    describe('When the application bootstraps', () => {
      it('Then it skips the non-handler method and marks all registry entries as orphans', () => {
        validator.onApplicationBootstrap();

        expect(loggerWarnSpy).toHaveBeenCalledTimes(3);
      });
    });
  });
});
