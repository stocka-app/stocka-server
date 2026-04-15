import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity({ name: 'store_rooms', schema: 'storage' })
export class StoreRoomEntity extends BaseEntity {
  @Column({ name: 'storage_id', type: 'int' })
  storageId!: number;

  @Column({ name: 'tenant_uuid', type: 'uuid' })
  tenantUUID!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 300, nullable: true, default: null })
  description!: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  address!: string | null;

  @Column({ type: 'varchar', length: 100 })
  icon!: string;

  @Column({ type: 'varchar', length: 20 })
  color!: string;

  @Column({ name: 'frozen_at', type: 'timestamptz', nullable: true, default: null })
  frozenAt!: Date | null;

  @ManyToOne(() => StorageEntity, (s) => s.storeRooms, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'storage_id' })
  storage!: StorageEntity;
}
