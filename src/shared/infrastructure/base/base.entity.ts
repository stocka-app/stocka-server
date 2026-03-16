import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidV7 } from 'uuid';

export abstract class BaseEntity {
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true, default: null })
  archivedAt!: Date | null;
}
