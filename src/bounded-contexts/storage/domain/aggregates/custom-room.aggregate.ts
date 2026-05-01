import { AggregateRoot } from '@shared/domain/base/aggregate-root';
import { Result, err, ok } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
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
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';
import { StorageAlreadyArchivedException } from '@storage/domain/exceptions/business/storage-already-archived.exception';
import { StorageAlreadyFrozenException } from '@storage/domain/exceptions/business/storage-already-frozen.exception';
import { StorageArchivedCannotBeFrozenException } from '@storage/domain/exceptions/business/storage-archived-cannot-be-frozen.exception';
import { StorageNotArchivedException } from '@storage/domain/exceptions/business/storage-not-archived.exception';
import { StorageNotFrozenException } from '@storage/domain/exceptions/business/storage-not-frozen.exception';
import {
  CustomRoomModel,
  type CustomRoomModelCreateProps,
} from '@storage/domain/models/custom-room.model';

export interface CustomRoomCreateProps extends CustomRoomModelCreateProps {
  actorUUID: string;
}

export type CustomRoomForTypeChangeProps = CustomRoomModelCreateProps;

export interface CustomRoomUpdateProps {
  name?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  roomType?: string;
  address?: string | null;
}

/**
 * Aggregate root for the CustomRoom storage type.
 *
 * Same shape as `StoreRoomAggregate` plus an additional mutable
 * `roomType` field (free-text label). Update emits
 * `StorageTypeChangedEvent` when `roomType` changes — preserves the
 * existing behavior of the previous Model+Publisher pair.
 */
export class CustomRoomAggregate extends AggregateRoot {
  private _model: CustomRoomModel;

  private constructor(model: CustomRoomModel) {
    super();
    this._model = model;
  }

  // ── Factories ──────────────────────────────────────────────────────────

  static create(props: CustomRoomCreateProps): CustomRoomAggregate {
    const model = CustomRoomModel.create({
      uuid: props.uuid,
      tenantUUID: props.tenantUUID,
      name: props.name,
      description: props.description,
      icon: props.icon,
      color: props.color,
      roomType: props.roomType,
      address: props.address,
    });
    const aggregate = new CustomRoomAggregate(model);
    aggregate.apply(
      new StorageCreatedEvent(
        model.uuid.toString(),
        model.tenantUUID.toString(),
        props.actorUUID,
        StorageType.CUSTOM_ROOM,
        model.name.getValue(),
      ),
    );
    return aggregate;
  }

  static reconstitute(model: CustomRoomModel): CustomRoomAggregate {
    return new CustomRoomAggregate(model);
  }

  static forTypeChange(props: CustomRoomForTypeChangeProps): CustomRoomAggregate {
    const model = CustomRoomModel.create({
      uuid: props.uuid,
      tenantUUID: props.tenantUUID,
      name: props.name,
      description: props.description,
      icon: props.icon,
      color: props.color,
      roomType: props.roomType,
      address: props.address,
    });
    return new CustomRoomAggregate(model);
  }

  // ── State transitions (Tell-Don't-Ask) ─────────────────────────────────

  markArchived(actorUUID: string): Result<void, DomainException> {
    if (this._model.archivedAt !== null) {
      return err(new StorageAlreadyArchivedException(this.uuid));
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
      return err(new StorageArchivedCannotBeFrozenException(this.uuid));
    }
    if (this._model.frozenAt !== null) {
      return err(new StorageAlreadyFrozenException(this.uuid));
    }
    this._model = this._model.with({ frozenAt: new Date() });
    this.apply(new StorageFrozenEvent(this.uuid, this._model.tenantUUID.toString(), actorUUID));
    return ok(undefined);
  }

  markUnfrozen(actorUUID: string): Result<void, DomainException> {
    if (this._model.frozenAt === null || this._model.archivedAt !== null) {
      return err(new StorageNotFrozenException(this.uuid));
    }
    this._model = this._model.with({ frozenAt: null });
    this.apply(
      new StorageReactivatedEvent(this.uuid, this._model.tenantUUID.toString(), actorUUID),
    );
    return ok(undefined);
  }

  markRestored(actorUUID: string): Result<void, DomainException> {
    if (this._model.archivedAt === null) {
      return err(new StorageNotArchivedException(this.uuid));
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
      return err(new StorageNotArchivedException(this.uuid));
    }
    this.apply(
      new StoragePermanentlyDeletedEvent(
        this.uuid,
        this._model.tenantUUID.toString(),
        actorUUID,
        StorageType.CUSTOM_ROOM,
        this._model.name.getValue(),
      ),
    );
    return ok(undefined);
  }

  update(props: CustomRoomUpdateProps, actorUUID: string): Result<void, DomainException> {
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

    if (props.roomType !== undefined && props.roomType !== this._model.roomType.getValue()) {
      const previous = this._model.roomType.getValue();
      next = next.with({ roomType: RoomTypeNameVO.create(props.roomType) });
      // Reuses StorageTypeChangedEvent — same payload contract (uuid, tenant, actor, from, to)
      // even though semantically this is a free-text room-type relabel, not a storage-type change.
      this.apply(
        new StorageTypeChangedEvent(
          this.uuid,
          this._model.tenantUUID.toString(),
          actorUUID,
          previous,
          props.roomType,
        ),
      );
    }

    if (props.address !== undefined) {
      const previous = this._model.address?.getValue() ?? null;
      const nextAddress = CustomRoomAggregate.resolveAddressUpdate(props.address);
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

  /** null → clear, '' → clear (form emptied), any string → trim+replace. */
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

  get model(): CustomRoomModel {
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

  get roomType(): RoomTypeNameVO {
    return this._model.roomType;
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
