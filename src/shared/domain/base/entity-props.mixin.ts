import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';

/**
 * Shared entity surface consumed by both `BaseModel` (non-root models) and
 * `AggregateRoot` (roots with event emission). Every domain entity has an
 * optional persisted `id`, a logical `uuid` (v7), lifecycle timestamps,
 * and a soft-delete `archivedAt` marker.
 */
export interface EntityProps {
  id?: number;
  uuid?: string;
  createdAt?: Date;
  updatedAt?: Date;
  archivedAt?: Date | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixin constraint requires `any[]` args per TS mixin rules
type Constructor<T = object> = abstract new (...args: any[]) => T;

/**
 * Surface added by the mixin into any base class. Subclasses inherit
 * everything declared here on top of `TBase`'s own surface.
 */
export interface EntityAware {
  _id: number | undefined;
  _uuid: UUIDVO;
  _createdAt: Date;
  _updatedAt: Date;
  _archivedAt: Date | null;
  readonly id: number | undefined;
  readonly uuid: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt: Date | null;
  isArchived(): boolean;
  archive(): void;
  restore(): void;
  touch(): void;
  _initEntity(props?: EntityProps): void;
}

/**
 * Mixes the shared entity surface into any base class. Used by the two
 * canonical domain bases to stay DRY without giving up their distinct
 * inheritance roots:
 *
 *   - `BaseModel` mixes onto `EmptyEntityBase` — no event emission
 *   - `AggregateRoot<E>` mixes onto `@nestjs/cqrs`'s `AggregateRoot<E>` — event emission
 *
 * Subclasses call `this._initEntity(props)` from their constructor *after*
 * `super()`. This keeps each root in control of its own constructor
 * signature and avoids colliding with `CQRSAggregateRoot`'s positional
 * `super()` contract.
 *
 * **Visibility**: the underscore-prefixed fields and `_initEntity` are
 * intentionally `public` (not `protected`). TS4094 forbids exporting an
 * anonymous class that carries `protected`/`private` members, so the
 * trade is `protected` (compile-time) for the underscore-prefix
 * convention (informal "do-not-touch" signal). External callers should
 * never read or write these directly — always use the public getters
 * and `archive`/`restore`/`touch` methods.
 */
export function WithEntityProps<TBase extends Constructor>(
  Base: TBase,
): TBase & Constructor<EntityAware> {
  abstract class EntityAwareImpl extends Base {
    _id: number | undefined;
    _uuid: UUIDVO;
    _createdAt: Date;
    _updatedAt: Date;
    _archivedAt: Date | null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixin rule: constructor must take `...args: any[]`
    constructor(...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- mixin forwarding: subclass constructors intercept the correct shape before calling super
      super(...args);
      this._id = undefined;
      this._uuid = new UUIDVO();
      this._createdAt = new Date();
      this._updatedAt = new Date();
      this._archivedAt = null;
    }

    _initEntity(props?: EntityProps): void {
      this._id = props?.id;
      this._uuid = new UUIDVO(props?.uuid);
      this._createdAt = props?.createdAt ?? this._createdAt;
      this._updatedAt = props?.updatedAt ?? this._updatedAt;
      this._archivedAt = props?.archivedAt ?? null;
    }

    get id(): number | undefined {
      return this._id;
    }

    get uuid(): string {
      return this._uuid.toString();
    }

    get createdAt(): Date {
      return this._createdAt;
    }

    get updatedAt(): Date {
      return this._updatedAt;
    }

    get archivedAt(): Date | null {
      return this._archivedAt;
    }

    isArchived(): boolean {
      return this._archivedAt !== null;
    }

    archive(): void {
      this._archivedAt = new Date();
      this._updatedAt = new Date();
    }

    restore(): void {
      this._archivedAt = null;
      this._updatedAt = new Date();
    }

    touch(): void {
      this._updatedAt = new Date();
    }
  }
  return EntityAwareImpl;
}
