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

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 300, nullable: true, default: null })
  description!: string | null;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'varchar', length: 100 })
  icon!: string;

  @Column({ type: 'varchar', length: 20 })
  color!: string;

  @Column({ name: 'frozen_at', type: 'timestamptz', nullable: true, default: null })
  frozenAt!: Date | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true, default: null })
  archivedAt!: Date | null;

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
