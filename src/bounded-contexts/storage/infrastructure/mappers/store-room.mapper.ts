import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';

export class StoreRoomMapper {
  static toDomain(entity: StoreRoomEntity): StoreRoomModel {
    return StoreRoomModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      address: entity.address,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(model: StoreRoomModel): Partial<StoreRoomEntity> {
    const entity: Partial<StoreRoomEntity> = {
      uuid: model.uuid,
      address: model.address,
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}
