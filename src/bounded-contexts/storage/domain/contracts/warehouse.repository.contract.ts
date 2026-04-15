import { WarehouseModel } from '@storage/domain/models/warehouse.model';

export interface IWarehouseRepository {
  count(tenantUUID: string): Promise<number>;
  findByUUID(uuid: string): Promise<WarehouseModel | null>;
  save(model: WarehouseModel, storageId: number): Promise<WarehouseModel>;
  deleteByUUID(uuid: string): Promise<void>;
}
