import { CustomRoomModel } from '@storage/domain/models/custom-room.model';

export interface ICustomRoomRepository {
  countActive(tenantUUID: string): Promise<number>;
  save(model: CustomRoomModel, storageId: number): Promise<CustomRoomModel>;
}
