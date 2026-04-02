import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';
import { v7 as uuidV7 } from 'uuid';

export interface StorageActivityLogEntryProps {
  id?: number;
  uuid: UUIDVO;
  storageUUID: UUIDVO;
  tenantUUID: UUIDVO;
  actorUUID: UUIDVO;
  action: StorageActivityAction;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  occurredAt: Date;
}

export class StorageActivityLogEntry {
  readonly id: number | undefined;
  readonly uuid: UUIDVO;
  readonly storageUUID: UUIDVO;
  readonly tenantUUID: UUIDVO;
  readonly actorUUID: UUIDVO;
  readonly action: StorageActivityAction;
  readonly previousValue: Record<string, unknown> | null;
  readonly newValue: Record<string, unknown> | null;
  readonly occurredAt: Date;

  private constructor(props: StorageActivityLogEntryProps) {
    this.id = props.id;
    this.uuid = props.uuid;
    this.storageUUID = props.storageUUID;
    this.tenantUUID = props.tenantUUID;
    this.actorUUID = props.actorUUID;
    this.action = props.action;
    this.previousValue = props.previousValue;
    this.newValue = props.newValue;
    this.occurredAt = props.occurredAt;
  }

  static create(props: {
    storageUUID: string;
    tenantUUID: string;
    actorUUID: string;
    action: StorageActivityAction;
    previousValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
  }): StorageActivityLogEntry {
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

  static reconstitute(props: StorageActivityLogEntryProps): StorageActivityLogEntry {
    return new StorageActivityLogEntry(props);
  }
}
