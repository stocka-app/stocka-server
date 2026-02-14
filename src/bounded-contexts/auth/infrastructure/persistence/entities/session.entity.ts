import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';

@Entity('sessions')
export class SessionEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'token_hash', type: 'varchar', length: 128 })
  @Index()
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
