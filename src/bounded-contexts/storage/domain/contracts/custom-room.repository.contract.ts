import { CustomRoomModel } from '@storage/domain/models/custom-room.model';

export interface ICustomRoomRepository {
  count(tenantUUID: string): Promise<number>;
  findByUUID(uuid: string): Promise<CustomRoomModel | null>;
  save(model: CustomRoomModel, storageId: number): Promise<CustomRoomModel>;
  deleteByUUID(uuid: string): Promise<void>;
}
