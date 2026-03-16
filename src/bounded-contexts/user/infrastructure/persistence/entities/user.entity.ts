import { Entity } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity('users')
export class UserEntity extends BaseEntity {}
