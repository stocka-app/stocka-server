import { AggregateRoot } from '@shared/domain/base/aggregate-root';
import { Result, err, ok } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageAddressChangedEvent } from '@storage/domain/events/storage-address-changed.event';
import { StorageArchivedEvent } from '@storage/domain/events/storage-archived.event';
import { StorageColorChangedEvent } from '@storage/domain/events/storage-color-changed.event';
import { StorageCreatedEvent } from '@storage/domain/events/storage-created.event';
import { StorageDescriptionChangedEvent } from '@storage/domain/events/storage-description-changed.event';
import { StorageFrozenEvent } from '@storage/domain/events/storage-frozen.event';
import { StorageIconChangedEvent } from '@storage/domain/events/storage-icon-changed.event';
import { StorageNameChangedEvent } from '@storage/domain/events/storage-name-changed.event';
import { StoragePermanentlyDeletedEvent } from '@storage/domain/events/storage-permanently-deleted.event';
import { StorageReactivatedEvent } from '@storage/domain/events/storage-reactivated.event';
import { StorageRestoredEvent } from '@storage/domain/events/storage-restored.event';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { StorageNotArchivedError } from '@storage/domain/errors/storage-not-archived.error';
import { StorageNotFrozenError } from '@storage/domain/errors/storage-not-frozen.error';
import {
  StoreRoomModel,
  type StoreRoomModelCreateProps,
} from '@storage/domain/models/store-room.model';

export interface StoreRoomCreateProps extends StoreRoomModelCreateProps {
  actorUUID: string;
}

export type StoreRoomForTypeChangeProps = StoreRoomModelCreateProps;

export interface StoreRoomUpdateProps {
  name?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  address?: string | null;
}

/**
 * Aggregate root for the StoreRoom storage type.
 *
 * Holds an immutable `StoreRoomModel` as state. Same pattern as
 * `WarehouseAggregate`, with one difference: address is nullable —
 * StoreRooms can be unaddressed. Update semantics for address: undefined
 * keeps the current value, null clears it, an empty string also clears
 * it (matches form-field behavior), any other string replaces it.
 */
export class StoreRoomAggregate extends AggregateRoot {
  private _model: StoreRoomModel;

  private constructor(model: StoreRoomModel) {
    super();
    this._model = model;
  }

  // ── Factories ──────────────────────────────────────────────────────────

  static create(props: StoreRoomCreateProps): StoreRoomAggregate {
    const model = StoreRoomModel.create({
      uuid: props.uuid,
      tenantUUID: props.tenantUUID,
      name: props.name,
      description: props.description,
      icon: props.icon,
      color: props.color,
      address: props.address,
    });
    const aggregate = new StoreRoomAggregate(model);
    aggregate.apply(
      new StorageCreatedEvent(
        model.uuid.toString(),
        model.tenantUUID.toString(),
        props.actorUUID,
        StorageType.STORE_ROOM,
        model.name.getValue(),
      ),
    );
    return aggregate;
  }

  static reconstitute(model: StoreRoomModel): StoreRoomAggregate {
    return new StoreRoomAggregate(model);
  }

  static forTypeChange(props: StoreRoomForTypeChangeProps): StoreRoomAggregate {
    const model = StoreRoomModel.create({
      uuid: props.uuid,
      tenantUUID: props.tenantUUID,
      name: props.name,
      description: props.description,
      icon: props.icon,
      color: props.color,
      address: props.address,
    });
    return new StoreRoomAggregate(model);
  }

  // ── State transitions (Tell-Don't-Ask) ─────────────────────────────────

  markArchived(actorUUID: string): Result<void, DomainException> {
    if (this._model.archivedAt !== null) {
      return err(new StorageAlreadyArchivedError(this.uuid));
    }
    this._model = this._model.with({
      archivedAt: new Date(),
      frozenAt: null,
    });
    this.apply(new StorageArchivedEvent(this.uuid, this._model.tenantUUID.toString(), actorUUID));
    return ok(undefined);
  }

  markFrozen(actorUUID: string): Result<void, DomainException> {
    if (this._model.archivedAt !== null) {
      return err(new StorageArchivedCannotBeFrozenError(this.uuid));
    }
    if (this._model.frozenAt !== null) {
      return err(new StorageAlreadyFrozenError(this.uuid));
    }
    this._model = this._model.with({ frozenAt: new Date() });
    this.apply(new StorageFrozenEvent(this.uuid, this._model.tenantUUID.toString(), actorUUID));
    return ok(undefined);
  }

  markUnfrozen(actorUUID: string): Result<void, DomainException> {
    if (this._model.frozenAt === null || this._model.archivedAt !== null) {
      return err(new StorageNotFrozenError(this.uuid));
    }
    this._model = this._model.with({ frozenAt: null });
    this.apply(
      new StorageReactivatedEvent(this.uuid, this._model.tenantUUID.toString(), actorUUID),
    );
    return ok(undefined);
  }

  markRestored(actorUUID: string): Result<void, DomainException> {
    if (this._model.archivedAt === null) {
      return err(new StorageNotArchivedError(this.uuid));
    }
    this._model = this._model.with({
      archivedAt: null,
      frozenAt: null,
    });
    this.apply(new StorageRestoredEvent(this.uuid, this._model.tenantUUID.toString(), actorUUID));
    return ok(undefined);
  }

  markPermanentlyDeleted(actorUUID: string): Result<void, DomainException> {
    if (this._model.archivedAt === null) {
      return err(new StorageNotArchivedError(this.uuid));
    }
    this.apply(
      new StoragePermanentlyDeletedEvent(
        this.uuid,
        this._model.tenantUUID.toString(),
        actorUUID,
        StorageType.STORE_ROOM,
        this._model.name.getValue(),
      ),
    );
    return ok(undefined);
  }

  update(props: StoreRoomUpdateProps, actorUUID: string): Result<void, DomainException> {
    let next = this._model;

    if (props.name !== undefined && props.name !== this._model.name.getValue()) {
      const previous = this._model.name.getValue();
      next = next.with({ name: StorageNameVO.create(props.name) });
      this.apply(
        new StorageNameChangedEvent(
          this.uuid,
          this._model.tenantUUID.toString(),
          actorUUID,
          previous,
          props.name,
        ),
      );
    }

    if (props.description !== undefined) {
      const previous = this._model.description?.getValue() ?? null;
      const nextDescription =
        props.description === null ? null : StorageDescriptionVO.create(props.description);
      const nextValue = nextDescription?.getValue() ?? null;
      if (previous !== nextValue) {
        next = next.with({ description: nextDescription });
        this.apply(
          new StorageDescriptionChangedEvent(
            this.uuid,
            this._model.tenantUUID.toString(),
            actorUUID,
            previous,
            nextValue,
          ),
        );
      }
    }

    if (props.icon !== undefined && props.icon !== this._model.icon.getValue()) {
      const previous = this._model.icon.getValue();
      next = next.with({ icon: StorageIconVO.create(props.icon) });
      this.apply(
        new StorageIconChangedEvent(
          this.uuid,
          this._model.tenantUUID.toString(),
          actorUUID,
          previous,
          props.icon,
        ),
      );
    }

    if (props.color !== undefined && props.color !== this._model.color.getValue()) {
      const previous = this._model.color.getValue();
      next = next.with({ color: StorageColorVO.create(props.color) });
      this.apply(
        new StorageColorChangedEvent(
          this.uuid,
          this._model.tenantUUID.toString(),
          actorUUID,
          previous,
          props.color,
        ),
      );
    }

    if (props.address !== undefined) {
      const previous = this._model.address?.getValue() ?? null;
      const nextAddress = StoreRoomAggregate.resolveAddressUpdate(props.address);
      const nextValue = nextAddress?.getValue() ?? null;
      if (previous !== nextValue) {
        next = next.with({ address: nextAddress });
        this.apply(
          new StorageAddressChangedEvent(
            this.uuid,
            this._model.tenantUUID.toString(),
            actorUUID,
            previous,
            nextValue,
          ),
        );
      }
    }

    this._model = next;
    return ok(undefined);
  }

  /**
   * Address update semantics for StoreRoom:
   *   null → clear, '' → clear (form emptied), any string → trim+replace.
   */
  private static resolveAddressUpdate(input: string | null): StorageAddressVO | null {
    if (input === null) return null;
    const trimmed = input.trim();
    if (trimmed === '') return null;
    return StorageAddressVO.create(trimmed);
  }

  // ── Queries ────────────────────────────────────────────────────────────

  isArchived(): boolean {
    return this._model.archivedAt !== null;
  }

  isFrozen(): boolean {
    return this._model.frozenAt !== null && this._model.archivedAt === null;
  }

  get status(): StorageStatus {
    if (this._model.archivedAt !== null) return StorageStatus.ARCHIVED;
    if (this._model.frozenAt !== null) return StorageStatus.FROZEN;
    return StorageStatus.ACTIVE;
  }

  // ── Identity / read access ─────────────────────────────────────────────

  get model(): StoreRoomModel {
    return this._model;
  }

  get id(): number | undefined {
    return this._model.id;
  }

  get uuid(): string {
    return this._model.uuid.toString();
  }

  get tenantUUID(): UUIDVO {
    return this._model.tenantUUID;
  }

  get name(): StorageNameVO {
    return this._model.name;
  }

  get description(): StorageDescriptionVO | null {
    return this._model.description;
  }

  get icon(): StorageIconVO {
    return this._model.icon;
  }

  get color(): StorageColorVO {
    return this._model.color;
  }

  get address(): StorageAddressVO | null {
    return this._model.address;
  }

  get frozenAt(): Date | null {
    return this._model.frozenAt;
  }

  get archivedAt(): Date | null {
    return this._model.archivedAt;
  }

  get createdAt(): Date {
    return this._model.createdAt;
  }

  get updatedAt(): Date {
    return this._model.updatedAt;
  }
}
