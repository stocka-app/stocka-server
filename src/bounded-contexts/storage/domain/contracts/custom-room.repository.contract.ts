import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';

export interface ICustomRoomRepository {
  count(tenantUUID: string): Promise<number>;
  findByUUID(uuid: string): Promise<CustomRoomAggregate | null>;
  save(aggregate: CustomRoomAggregate, storageId: number): Promise<CustomRoomAggregate>;
  deleteByUUID(uuid: string): Promise<void>;
}
