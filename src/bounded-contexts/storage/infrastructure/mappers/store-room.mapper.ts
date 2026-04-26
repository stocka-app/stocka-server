import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';

export class StoreRoomMapper {
  static toDomain(entity: StoreRoomEntity): StoreRoomAggregate {
    const model = StoreRoomModel.reconstitute({
      id: entity.id,
      uuid: new UUIDVO(entity.uuid),
      tenantUUID: new UUIDVO(entity.tenantUUID),
      name: new StorageNameVO(entity.name),
      description: entity.description ? new StorageDescriptionVO(entity.description) : null,
      icon: new StorageIconVO(entity.icon),
      color: new StorageColorVO(entity.color),
      address: entity.address ? new StorageAddressVO(entity.address) : null,
      frozenAt: entity.frozenAt,
      archivedAt: entity.archivedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
    return StoreRoomAggregate.reconstitute(model);
  }

  static toEntity(aggregate: StoreRoomAggregate, storageId?: number): Partial<StoreRoomEntity> {
    const model = aggregate.model;
    const entity: Partial<StoreRoomEntity> = {
      id: model.id,
      uuid: model.uuid.toString(),
      tenantUUID: model.tenantUUID.toString(),
      name: model.name.getValue(),
      description: model.description?.getValue() ?? null,
      icon: model.icon.getValue(),
      color: model.color.getValue(),
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
