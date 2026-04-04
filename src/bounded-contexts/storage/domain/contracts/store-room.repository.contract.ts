import { StoreRoomModel } from '@storage/domain/models/store-room.model';

export interface IStoreRoomRepository {
  countActive(tenantUUID: string): Promise<number>;
  save(model: StoreRoomModel, storageId: number): Promise<StoreRoomModel>;
}
