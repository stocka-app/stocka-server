import {
  Entity,
  Column,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidV7 } from 'uuid';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';

@Entity({ name: 'storages', schema: 'storage' })
@Index('idx_storages_tenant_uuid', ['tenantUUID'])
@Index('idx_storages_parent_uuid', ['parentUUID'], { where: '"parent_uuid" IS NOT NULL' })
export class StorageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid', unique: true })
  uuid!: string;

  @BeforeInsert()
  generateUUID(): void {
    if (!this.uuid) {
      this.uuid = uuidV7();
    }
  }

  @Column({ name: 'tenant_uuid', type: 'uuid' })
  tenantUUID!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: StorageType;

  @Column({ name: 'parent_uuid', type: 'uuid', nullable: true, default: null })
  parentUUID!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => CustomRoomEntity, (cr) => cr.storage, { cascade: true, eager: true })
  customRoom!: CustomRoomEntity | null;

  @OneToOne(() => StoreRoomEntity, (sr) => sr.storage, { cascade: true, eager: true })
  storeRoom!: StoreRoomEntity | null;

  @OneToOne(() => WarehouseEntity, (wh) => wh.storage, { cascade: true, eager: true })
  warehouse!: WarehouseEntity | null;
}
