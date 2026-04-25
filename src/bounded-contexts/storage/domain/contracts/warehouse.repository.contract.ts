import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';

export interface IWarehouseRepository {
  count(tenantUUID: string): Promise<number>;
  findByUUID(uuid: string): Promise<WarehouseAggregate | null>;
  save(aggregate: WarehouseAggregate, storageId: number): Promise<WarehouseAggregate>;
  deleteByUUID(uuid: string): Promise<void>;
}
