import { WarehouseModel } from '@storage/domain/models/warehouse.model';

export interface IWarehouseRepository {
  countActive(tenantUUID: string): Promise<number>;
  save(model: WarehouseModel, storageId: number): Promise<WarehouseModel>;
}
