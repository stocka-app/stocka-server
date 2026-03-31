import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { SecurityRegistry } from '@common/security/security-registry';

@Injectable()
export class SecurityBootstrapValidator implements OnApplicationBootstrap {
  private readonly logger = new Logger(SecurityBootstrapValidator.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onApplicationBootstrap(): void {
    const registeredKeys = new Set<string>();

    const controllers = this.discoveryService.getControllers();

    for (const wrapper of controllers) {
      const { instance } = wrapper;
      if (!instance) continue;

      const prototype = Object.getPrototypeOf(instance) as Record<string, unknown>;
      const controllerPath: string =
        (Reflect.getMetadata('path', instance.constructor as object) as string | undefined) ?? '';

      this.metadataScanner.scanFromPrototype(instance, prototype, (methodKey: string): void => {
        const handler = prototype[methodKey];
        if (typeof handler !== 'function') return;

        const handlerPath: string =
          (Reflect.getMetadata('path', handler) as string | undefined) ?? '';
        const methodValue: number | undefined = Reflect.getMetadata('method', handler) as
          | number
          | undefined;
        if (methodValue === undefined) return;

        const method: string = RequestMethod[methodValue] ?? 'GET';
        const segments = [controllerPath, handlerPath].filter(Boolean);
        const fullPath = segments.length > 0 ? `/${segments.join('/')}` : '/';
        const normalized = fullPath.replace(/\/+/g, '/');
        const key = `${method} ${normalized}`;

        registeredKeys.add(key);
      });
    }

    // Warn about orphan registry entries (in registry but no matching route)
    for (const key of Object.keys(SecurityRegistry)) {
      if (!registeredKeys.has(key)) {
        this.logger.warn(
          `SecurityRegistry has orphan entry: "${key}" — no matching controller route found`,
        );
      }
    }

    this.logger.log(
      `SecurityBootstrapValidator: ${registeredKeys.size} routes scanned, ${Object.keys(SecurityRegistry).length} registry entries`,
    );
  }
}
