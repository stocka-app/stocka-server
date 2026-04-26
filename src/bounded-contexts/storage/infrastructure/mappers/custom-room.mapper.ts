import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';

export class CustomRoomMapper {
  static toDomain(entity: CustomRoomEntity): CustomRoomAggregate {
    const model = CustomRoomModel.reconstitute({
      id: entity.id,
      uuid: new UUIDVO(entity.uuid),
      tenantUUID: new UUIDVO(entity.tenantUUID),
      name: StorageNameVO.create(entity.name),
      description: entity.description ? StorageDescriptionVO.create(entity.description) : null,
      icon: StorageIconVO.create(entity.icon),
      color: StorageColorVO.create(entity.color),
      roomType: RoomTypeNameVO.create(entity.roomType),
      address: entity.address ? StorageAddressVO.create(entity.address) : null,
      frozenAt: entity.frozenAt,
      archivedAt: entity.archivedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
    return CustomRoomAggregate.reconstitute(model);
  }

  static toEntity(aggregate: CustomRoomAggregate, storageId?: number): Partial<CustomRoomEntity> {
    const model = aggregate.model;
    const entity: Partial<CustomRoomEntity> = {
      id: model.id,
      uuid: model.uuid.toString(),
      tenantUUID: model.tenantUUID.toString(),
      name: model.name.getValue(),
      description: model.description?.getValue() ?? null,
      icon: model.icon.getValue(),
      color: model.color.getValue(),
      roomType: model.roomType.getValue(),
      address: model.address?.getValue() ?? null,
      frozenAt: model.frozenAt,
      archivedAt: model.archivedAt,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };

    if (storageId !== undefined) {
      entity.storageId = storageId;
    }

    return entity;
  }
}
