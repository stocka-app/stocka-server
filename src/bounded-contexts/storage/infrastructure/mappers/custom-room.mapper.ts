import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';

export class CustomRoomMapper {
  static toDomain(entity: CustomRoomEntity): CustomRoomModel {
    return CustomRoomModel.reconstitute({
      id: entity.id,
      uuid: new UUIDVO(entity.uuid),
      name: StorageNameVO.create(entity.name),
      description: entity.description ? StorageDescriptionVO.create(entity.description) : null,
      icon: StorageIconVO.create(entity.icon),
      color: StorageColorVO.create(entity.color),
      roomType: RoomTypeNameVO.create(entity.roomType),
      address: StorageAddressVO.create(entity.address),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(model: CustomRoomModel): Partial<CustomRoomEntity> {
    const entity: Partial<CustomRoomEntity> = {
      uuid: model.uuid.toString(),
      name: model.name.getValue(),
      description: model.description?.getValue() ?? null,
      icon: model.icon.getValue(),
      color: model.color.getValue(),
      roomType: model.roomType.getValue(),
      address: model.address.getValue(),
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}
