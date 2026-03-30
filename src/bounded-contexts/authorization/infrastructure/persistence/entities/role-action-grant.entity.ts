import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { AuthzRoleEntity } from '@authorization/infrastructure/persistence/entities/authz-role.entity';

@Entity({ name: 'role_action_grants', schema: 'authz' })
export class RoleActionGrantEntity {
  @PrimaryColumn({ name: 'role_key', type: 'varchar', length: 30 })
  roleKey!: string;

  @PrimaryColumn({ name: 'action_key', type: 'varchar', length: 100 })
  actionKey!: string;

  @ManyToOne(() => AuthzRoleEntity)
  @JoinColumn({ name: 'role_key', referencedColumnName: 'key' })
  role!: AuthzRoleEntity;
}
