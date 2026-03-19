import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';

export class WarehouseMapper {
  static toDomain(entity: WarehouseEntity): WarehouseModel {
    return WarehouseModel.reconstitute({
      uuid: entity.uuid,
      address: entity.address,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(model: WarehouseModel): Partial<WarehouseEntity> {
    return {
      uuid: model.uuid,
      address: model.address,
    };
  }
}
