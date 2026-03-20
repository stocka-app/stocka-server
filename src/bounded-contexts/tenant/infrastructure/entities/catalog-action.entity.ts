import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ModuleEntity } from '@tenant/infrastructure/entities/module.entity';

@Entity({ name: 'catalog_actions', schema: 'capabilities' })
export class CatalogActionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'module_id', type: 'int' })
  moduleId!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  key!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'action_type', type: 'varchar', length: 50 })
  actionType!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => ModuleEntity)
  @JoinColumn({ name: 'module_id' })
  module!: ModuleEntity;
}
