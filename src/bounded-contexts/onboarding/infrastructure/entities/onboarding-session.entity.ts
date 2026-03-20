import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'onboarding_sessions', schema: 'onboarding' })
export class OnboardingSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_uuid', type: 'varchar', length: 36, unique: true })
  @Index()
  userUUID!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  path!: string | null;

  @Column({ name: 'current_step', type: 'int', default: 0 })
  currentStep!: number;

  @Column({ name: 'step_data', type: 'jsonb', default: '{}' })
  stepData!: Record<string, unknown>;

  @Column({ name: 'invitation_code', type: 'varchar', length: 128, nullable: true })
  invitationCode!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'IN_PROGRESS' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
