import { Entity, Column, Index, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';

@Entity({ name: 'storages', schema: 'storage' })
@Index('idx_storages_tenant_uuid', ['tenantUUID'])
export class StorageEntity extends BaseEntity {
  @Column({ name: 'tenant_uuid', type: 'uuid' })
  tenantUUID!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true, default: null })
  description!: string | null;

  @Column({ name: 'frozen_at', type: 'timestamptz', nullable: true, default: null })
  frozenAt!: Date | null;

  @OneToOne(() => CustomRoomEntity, (cr) => cr.storage, { cascade: true, eager: true })
  customRoom!: CustomRoomEntity | null;

  @OneToOne(() => StoreRoomEntity, (sr) => sr.storage, { cascade: true, eager: true })
  storeRoom!: StoreRoomEntity | null;

  @OneToOne(() => WarehouseEntity, (wh) => wh.storage, { cascade: true, eager: true })
  warehouse!: WarehouseEntity | null;
}
