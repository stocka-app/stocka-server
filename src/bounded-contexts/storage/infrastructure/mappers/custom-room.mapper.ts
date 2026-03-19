import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';

export class CustomRoomMapper {
  static toDomain(entity: CustomRoomEntity): CustomRoomModel {
    return CustomRoomModel.reconstitute({
      uuid: entity.uuid,
      roomType: entity.roomType,
      address: entity.address,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(model: CustomRoomModel): Partial<CustomRoomEntity> {
    return {
      uuid: model.uuid,
      roomType: model.roomType,
      address: model.address,
    };
  }
}
