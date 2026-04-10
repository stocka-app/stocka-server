import { StoreRoomModel } from '@storage/domain/models/store-room.model';

export interface IStoreRoomRepository {
  count(tenantUUID: string): Promise<number>;
  save(model: StoreRoomModel, storageId: number): Promise<StoreRoomModel>;
  deleteByUUID(uuid: string): Promise<void>;
}
