import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';

export class CustomRoomMapper {
  static toDomain(entity: CustomRoomEntity): CustomRoomModel {
    return CustomRoomModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      roomType: entity.roomType,
      address: entity.address,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(model: CustomRoomModel): Partial<CustomRoomEntity> {
    const entity: Partial<CustomRoomEntity> = {
      uuid: model.uuid,
      roomType: model.roomType,
      address: model.address,
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}
