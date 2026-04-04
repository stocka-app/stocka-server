import { Entity, Column, Index, OneToMany } from 'typeorm';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity({ name: 'storages', schema: 'storage' })
@Index('idx_storages_tenant_uuid', ['tenantUUID'])
export class StorageEntity extends BaseEntity {
  @Column({ name: 'tenant_uuid', type: 'uuid' })
  tenantUUID!: string;

  @OneToMany(() => CustomRoomEntity, (cr) => cr.storage, { cascade: true })
  customRooms!: CustomRoomEntity[];

  @OneToMany(() => StoreRoomEntity, (sr) => sr.storage, { cascade: true })
  storeRooms!: StoreRoomEntity[];

  @OneToMany(() => WarehouseEntity, (wh) => wh.storage, { cascade: true })
  warehouses!: WarehouseEntity[];
}
