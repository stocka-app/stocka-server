import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';

export class StoreRoomMapper {
  static toDomain(entity: StoreRoomEntity): StoreRoomModel {
    return StoreRoomModel.reconstitute({
      id: entity.id,
      uuid: new UUIDVO(entity.uuid),
      name: new StorageNameVO(entity.name),
      description: entity.description ? new StorageDescriptionVO(entity.description) : null,
      icon: new StorageIconVO(entity.icon),
      color: new StorageColorVO(entity.color),
      address: new StorageAddressVO(entity.address),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(model: StoreRoomModel): Partial<StoreRoomEntity> {
    const entity: Partial<StoreRoomEntity> = {
      uuid: model.uuid.toString(),
      name: model.name.getValue(),
      description: model.description?.getValue() ?? null,
      icon: model.icon.getValue(),
      color: model.color.getValue(),
      address: model.address.getValue(),
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}
