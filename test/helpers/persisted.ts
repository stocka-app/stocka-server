import { Persisted } from '@shared/domain/contracts/base-repository.contract';

/**
 * Test helper that tags a domain model as `Persisted<T>` for mock setup.
 *
 * Motivation
 * ----------
 * Repository contracts (`findById`, `findByUUID`, `persist`) return
 * `Persisted<T> = T & { id: number }` to express the invariant that any
 * model fetched from or saved to the DB has a numeric id. In unit tests
 * we build models via object-mothers or inline factories that already
 * populate `id`, but TypeScript can't tell — the base AggregateRoot
 * exposes `id: number | undefined` and `model.create()` factories
 * return `T`, not `Persisted<T>`.
 *
 * Using `as unknown as Persisted<T>` all over the codebase hides bugs
 * (you can tag a model that never got an id and jest will happily mock
 * with a broken shape). This helper:
 *
 * 1. Validates at runtime that the model actually has a numeric id.
 * 2. Centralises the unavoidable type assertion in one place.
 * 3. Gives a clear error when a mother is misconfigured.
 */
function findIdDescriptor(model: object): PropertyDescriptor | undefined {
  let proto: object | null = Object.getPrototypeOf(model) as object | null;
  while (proto && proto !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'id');
    if (descriptor) return descriptor;
    proto = Object.getPrototypeOf(proto) as object | null;
  }
  return undefined;
}

export function asPersisted<T extends { id?: number }>(model: T, id = 1): Persisted<T> {
  if (model.id === undefined) {
    // Domain models expose `id` via a getter over a protected `_id` field set
    // by `.reconstitute()`. For those models the caller must have passed an id
    // to `reconstitute`. For plain object mocks we assign `id` directly.
    const descriptor = findIdDescriptor(model as object);
    if (descriptor?.get && !descriptor.set) {
      const record = model as unknown as Record<string, unknown>;
      if ('_id' in record) {
        record._id = id;
      } else {
        throw new TypeError(
          'asPersisted: model exposes `id` via a getter but has no `_id` field — pass an id to its factory instead.',
        );
      }
    } else {
      (model as T & { id: number }).id = id;
    }
  } else if (typeof model.id !== 'number') {
    throw new TypeError(`asPersisted: expected model.id to be a number, got ${typeof model.id}`);
  }
  return model as Persisted<T>;
}
