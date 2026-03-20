import { Entity } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity({ name: 'users', schema: 'identity' })
export class UserEntity extends BaseEntity {}
