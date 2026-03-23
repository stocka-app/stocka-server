import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { AuthzRoleEntity } from '@tenant/infrastructure/entities/authz-role.entity';

@Entity({ name: 'role_delegation_rules', schema: 'authz' })
export class RoleDelegationRuleEntity {
  @PrimaryColumn({ name: 'inviter_role_key', type: 'varchar', length: 30 })
  inviterRoleKey!: string;

  @PrimaryColumn({ name: 'target_role_key', type: 'varchar', length: 30 })
  targetRoleKey!: string;

  @ManyToOne(() => AuthzRoleEntity)
  @JoinColumn({ name: 'inviter_role_key', referencedColumnName: 'key' })
  inviterRole!: AuthzRoleEntity;

  @ManyToOne(() => AuthzRoleEntity)
  @JoinColumn({ name: 'target_role_key', referencedColumnName: 'key' })
  targetRole!: AuthzRoleEntity;
}
