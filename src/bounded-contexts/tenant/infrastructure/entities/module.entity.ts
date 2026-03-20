import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'modules', schema: 'capabilities' })
export class ModuleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  key!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
