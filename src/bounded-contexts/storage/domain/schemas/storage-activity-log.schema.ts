import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';

export interface StorageActivityLogEntryProps {
  uuid: UUIDVO;
  storageUUID: UUIDVO;
  tenantUUID: UUIDVO;
  actorUUID: UUIDVO;
  action: StorageActivityAction;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  occurredAt: Date;

  id?: number;
}

export interface StorageActivityLogEntryAttrs {
  uuid: UUIDVO;
  storageUUID: UUIDVO;
  tenantUUID: UUIDVO;
  actorUUID: UUIDVO;
  action: StorageActivityAction;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  occurredAt: Date;

  id?: number;
}

export type StorageActivityLogCreateProps = {
  storageUUID: string;
  tenantUUID: string;
  actorUUID: string;
  action: StorageActivityAction;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
};

export type StorageActivityLogReconstituteProps = StorageActivityLogEntryProps;
