import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'roles', schema: 'authz' })
export class AuthzRoleEntity {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  key!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 100 })
  nameEn!: string;

  @Column({ name: 'name_es', type: 'varchar', length: 100 })
  nameEs!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'hierarchy_level', type: 'smallint' })
  hierarchyLevel!: number;

  @Column({ name: 'is_system', type: 'boolean', default: true })
  isSystem!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
