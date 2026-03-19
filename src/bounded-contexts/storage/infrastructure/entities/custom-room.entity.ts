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

@Entity('custom_rooms')
export class CustomRoomEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid', unique: true })
  uuid!: string;

  @Column({ name: 'storage_id', type: 'int' })
  storageId!: number;

  @Column({ name: 'room_type', type: 'varchar', length: 50 })
  roomType!: string;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => StorageEntity, (s) => s.customRoom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storage_id' })
  storage!: StorageEntity;

  @BeforeInsert()
  generateUUID(): void {
    if (!this.uuid) {
      this.uuid = uuidV7();
    }
  }
}
