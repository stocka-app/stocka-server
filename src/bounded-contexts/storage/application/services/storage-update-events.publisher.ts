import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageNameChangedEvent } from '@storage/domain/events/storage-name-changed.event';
import { StorageDescriptionChangedEvent } from '@storage/domain/events/storage-description-changed.event';
import { StorageAddressChangedEvent } from '@storage/domain/events/storage-address-changed.event';
import { StorageIconChangedEvent } from '@storage/domain/events/storage-icon-changed.event';
import { StorageColorChangedEvent } from '@storage/domain/events/storage-color-changed.event';
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';

type AnyStorageModel = WarehouseModel | StoreRoomModel | CustomRoomModel;

interface UpdateFields {
  name?: string;
  description?: string | null;
  address?: string | null;
  icon?: string;
  color?: string;
  /** custom-room only */
  roomType?: string;
}

/**
 * Publishes the set of field-change events that correspond to a storage
 * update. Extracted from `StorageAggregate.emitUpdateEvents` during the
 * DT-H07-4 refactor so the per-type UpdateXHandler can skip the aggregate.
 *
 * The publisher emits only the events whose field actually changed — a
 * no-op for a PATCH that sends the same value twice.
 */
@Injectable()
export class StorageUpdateEventsPublisher {
  constructor(private readonly eventBus: EventBus) {}

  publish(params: {
    uuid: string;
    tenantUUID: string;
    actorUUID: string;
    before: AnyStorageModel;
    after: AnyStorageModel;
    fields: UpdateFields;
  }): void {
    const { uuid, tenantUUID, actorUUID, before, after, fields } = params;

    if (fields.name !== undefined && fields.name !== before.name.getValue()) {
      this.eventBus.publish(
        new StorageNameChangedEvent(
          uuid,
          tenantUUID,
          actorUUID,
          before.name.getValue(),
          after.name.getValue(),
        ),
      );
    }

    if (fields.description !== undefined) {
      const prevDesc = before.description?.getValue() ?? null;
      const nextDesc = after.description?.getValue() ?? null;
      if (prevDesc !== nextDesc) {
        this.eventBus.publish(
          new StorageDescriptionChangedEvent(uuid, tenantUUID, actorUUID, prevDesc, nextDesc),
        );
      }
    }

    if (fields.address !== undefined) {
      const prevAddr = before.address?.getValue() ?? null;
      const nextAddr = after.address?.getValue() ?? null;
      if (prevAddr !== nextAddr) {
        this.eventBus.publish(
          new StorageAddressChangedEvent(uuid, tenantUUID, actorUUID, prevAddr, nextAddr),
        );
      }
    }

    if (fields.icon !== undefined && fields.icon !== before.icon.getValue()) {
      this.eventBus.publish(
        new StorageIconChangedEvent(
          uuid,
          tenantUUID,
          actorUUID,
          before.icon.getValue(),
          after.icon.getValue(),
        ),
      );
    }

    if (fields.color !== undefined && fields.color !== before.color.getValue()) {
      this.eventBus.publish(
        new StorageColorChangedEvent(
          uuid,
          tenantUUID,
          actorUUID,
          before.color.getValue(),
          after.color.getValue(),
        ),
      );
    }

    if (
      fields.roomType !== undefined &&
      before instanceof CustomRoomModel &&
      after instanceof CustomRoomModel &&
      fields.roomType !== before.roomType.getValue()
    ) {
      this.eventBus.publish(
        new StorageTypeChangedEvent(
          uuid,
          tenantUUID,
          actorUUID,
          before.roomType.getValue(),
          after.roomType.getValue(),
        ),
      );
    }
  }
}
