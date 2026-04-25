import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';

export interface IStoreRoomRepository {
  count(tenantUUID: string): Promise<number>;
  findByUUID(uuid: string): Promise<StoreRoomAggregate | null>;
  save(aggregate: StoreRoomAggregate, storageId: number): Promise<StoreRoomAggregate>;
  deleteByUUID(uuid: string): Promise<void>;
}
