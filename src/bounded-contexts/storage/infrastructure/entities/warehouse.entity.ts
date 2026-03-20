import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidV7 } from 'uuid';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';

@Entity({ name: 'warehouses', schema: 'storage' })
export class WarehouseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid', unique: true })
  uuid!: string;

  @Column({ name: 'storage_id', type: 'int' })
  storageId!: number;

  @Column({ type: 'text' })
  address!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => StorageEntity, (s) => s.warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storage_id' })
  storage!: StorageEntity;

  @BeforeInsert()
  generateUUID(): void {
    if (!this.uuid) {
      this.uuid = uuidV7();
    }
  }
}
