import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';

export class StoreRoomMapper {
  static toDomain(entity: StoreRoomEntity): StoreRoomModel {
    return StoreRoomModel.reconstitute({
      uuid: entity.uuid,
      address: entity.address,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(model: StoreRoomModel): Partial<StoreRoomEntity> {
    return {
      uuid: model.uuid,
      address: model.address,
    };
  }
}
