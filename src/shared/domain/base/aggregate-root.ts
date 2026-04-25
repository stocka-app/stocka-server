import { AggregateRoot as CQRSAggregateRoot, IEvent } from '@nestjs/cqrs';
import { WithEntityProps, type EntityProps } from '@shared/domain/base/entity-props.mixin';

/**
 * Props accepted by `AggregateRoot` subclasses. Identical surface to
 * `BaseModelProps` — the semantic distinction lives in which base class
 * the entity inherits from, not in the shape of its props.
 */
export type AggregateRootProps = EntityProps;

/**
 * Base class for DDD **Aggregate Roots** — the single entry point to an
 * aggregate, responsible for transactional consistency and for emitting
 * domain events when the aggregate transitions state.
 *
 * Extends `@nestjs/cqrs`'s `AggregateRoot<E>` so `this.apply(event)` and
 * `this.commit()` are available for event publishing; mixes in the shared
 * entity surface (`id`, `uuid`, timestamps, archive/restore semantics)
 * via `WithEntityProps`.
 *
 * Pick `AggregateRoot` for roots like `UserAggregate`, `TenantAggregate`,
 * `SessionAggregate`, `StorageAggregate` — entities that are *the*
 * starting point of an aggregate and whose mutations should emit events
 * for reactive event handlers.
 *
 * Pick `BaseModel` instead for non-root models inside a larger aggregate.
 *
 * **Generic preservation**: the mixin receives `CQRSAggregateRoot` as a
 * non-generic class value, which collapses its `<E>` event parameter to
 * the default `IEvent`. The `declare` overrides below re-expose the
 * event-typed methods with the correct `EventBase` parameter so consumers
 * get full type safety on their custom event hierarchy. `declare` is a
 * type-only construct — zero runtime effect, just narrowing the inherited
 * signature.
 */
export abstract class AggregateRoot<EventBase extends IEvent = IEvent> extends WithEntityProps(
  CQRSAggregateRoot,
) {
  declare apply: <T extends EventBase = EventBase>(
    event: T,
    options?: { skipHandler?: boolean; fromHistory?: boolean } | boolean,
  ) => void;
  declare getUncommittedEvents: () => EventBase[];
  declare loadFromHistory: (history: EventBase[]) => void;

  constructor(props?: AggregateRootProps) {
    super();
    this._initEntity(props);
  }
}
