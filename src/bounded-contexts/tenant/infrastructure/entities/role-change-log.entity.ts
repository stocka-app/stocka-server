import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'role_change_log', schema: 'authz' })
export class RoleChangeLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'tenant_id', type: 'int' })
  tenantId!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'previous_role', type: 'varchar', length: 30 })
  previousRole!: string;

  @Column({ name: 'new_role', type: 'varchar', length: 30 })
  newRole!: string;

  @Column({ name: 'changed_by', type: 'int' })
  changedBy!: number;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'changed_at', type: 'timestamptz', default: () => 'NOW()' })
  changedAt!: Date;
}
