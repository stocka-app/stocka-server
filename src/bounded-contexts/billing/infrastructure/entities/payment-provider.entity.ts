import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'payment_providers', schema: 'billing' })
export class PaymentProviderEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ name: 'api_version', type: 'varchar', length: 50, nullable: true })
  apiVersion!: string | null;

  @Column({ name: 'default_currency', type: 'char', length: 3, nullable: true })
  defaultCurrency!: string | null;

  @Column({ name: 'webhook_endpoint_path', type: 'varchar', length: 200, nullable: true })
  webhookEndpointPath!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
