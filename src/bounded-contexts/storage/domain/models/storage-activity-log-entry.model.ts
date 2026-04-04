import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';
import { v7 as uuidV7 } from 'uuid';
import type {
  StorageActivityLogCreateProps,
  StorageActivityLogEntryAttrs,
  StorageActivityLogEntryProps,
  StorageActivityLogReconstituteProps,
} from '@storage/domain/schemas/storage-activity-log.schema';

export class StorageActivityLogEntry {
  private readonly attrs: StorageActivityLogEntryAttrs;

  private constructor(props: StorageActivityLogEntryProps) {
    this.attrs = StorageActivityLogEntry.normalizeProps(props);
  }

  static create(props: StorageActivityLogCreateProps): StorageActivityLogEntry {
    return new StorageActivityLogEntry({
      uuid: new UUIDVO(uuidV7()),
      storageUUID: new UUIDVO(props.storageUUID),
      tenantUUID: new UUIDVO(props.tenantUUID),
      actorUUID: new UUIDVO(props.actorUUID),
      action: props.action,
      previousValue: props.previousValue ?? null,
      newValue: props.newValue ?? null,
      occurredAt: new Date(),
    });
  }

  static reconstitute(props: StorageActivityLogReconstituteProps): StorageActivityLogEntry {
    return new StorageActivityLogEntry(props);
  }

  get id(): number | undefined {
    return this.attrs.id;
  }

  get uuid(): UUIDVO {
    return this.attrs.uuid;
  }

  get storageUUID(): UUIDVO {
    return this.attrs.storageUUID;
  }

  get tenantUUID(): UUIDVO {
    return this.attrs.tenantUUID;
  }

  get actorUUID(): UUIDVO {
    return this.attrs.actorUUID;
  }

  get action(): StorageActivityAction {
    return this.attrs.action;
  }

  get previousValue(): Record<string, unknown> | null {
    return this.attrs.previousValue;
  }

  get newValue(): Record<string, unknown> | null {
    return this.attrs.newValue;
  }

  get occurredAt(): Date {
    return this.attrs.occurredAt;
  }

  private static normalizeProps(props: StorageActivityLogEntryProps): StorageActivityLogEntryAttrs {
    return {
      id: props.id,
      uuid: props.uuid,
      storageUUID: props.storageUUID,
      tenantUUID: props.tenantUUID,
      actorUUID: props.actorUUID,
      action: props.action,
      previousValue: props.previousValue,
      newValue: props.newValue,
      occurredAt: props.occurredAt,
    };
  }
}
