import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';

/**
 * Backward-compatible props shape used by Models that accept reconstitute
 * payloads carrying entity surface fields. Pure Models inheriting the new
 * `BaseModel` declare their own constructor and don't need this — it
 * remains exported for legacy Models that already use
 * `XReconstituteProps extends BaseModelProps`.
 */
export interface BaseModelProps {
  id?: number;
  uuid?: string;
  createdAt?: Date;
  updatedAt?: Date;
  archivedAt?: Date | null;
}

/**
 * Base for DDD **Models** — entities that participate in an aggregate but
 * do not act as its root.
 *
 * Pure abstract: declares only the universal entity surface (id, uuid,
 * lifecycle timestamps, soft-delete marker) plus one derived query
 * (`isArchived`). It contains zero state and zero business operations.
 *
 * In the Pure Model + Aggregate Operator pattern:
 *   - Pure Models are immutable snapshots — every "transition" produces a
 *     new instance via a `with()` method.
 *   - All business operations (archive, freeze, restore, update, etc.)
 *     live in the corresponding `*Aggregate`. The aggregate replaces its
 *     internal model reference with the new snapshot and emits the
 *     appropriate domain event.
 *
 * Legacy Models that still mutate state in place (the pre-refactor
 * pattern) extend this class too — they declare their own `protected`
 * mutable fields and a private `touch()` method internally. Eventually
 * they should migrate to the Pure pattern; the contract here is the
 * transitional anchor.
 */
export abstract class BaseModel {
  abstract readonly id?: number;
  abstract readonly uuid: UUIDVO;
  abstract readonly createdAt: Date;
  abstract readonly updatedAt: Date;
  abstract readonly archivedAt: Date | null;

  isArchived(): boolean {
    return this.archivedAt !== null;
  }
}
