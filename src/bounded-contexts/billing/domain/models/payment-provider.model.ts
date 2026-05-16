import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';

export interface PaymentProviderModelReconstituteProps {
  code: PaymentProviderCodeVO;
  name: string;
  isEnabled: boolean;
  apiVersion: string | null;
  defaultCurrency: string | null;
  webhookEndpointPath: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pure data carrier for a payment provider catalog row. PK is `code` (VARCHAR),
 * not a uuid — so this model does NOT extend `BaseModel`. There is no
 * `archivedAt` (catalog rows are toggled via `isEnabled` instead) and no
 * surrogate `id` column.
 *
 * Catalog management is out-of-band: seeded by migrations + manual SQL until
 * an admin tool exists. Billing only reads.
 */
export class PaymentProviderModel {
  constructor(
    public readonly code: PaymentProviderCodeVO,
    public readonly name: string,
    public readonly isEnabled: boolean,
    public readonly apiVersion: string | null,
    public readonly defaultCurrency: string | null,
    public readonly webhookEndpointPath: string | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static reconstitute(props: PaymentProviderModelReconstituteProps): PaymentProviderModel {
    return new PaymentProviderModel(
      props.code,
      props.name,
      props.isEnabled,
      props.apiVersion,
      props.defaultCurrency,
      props.webhookEndpointPath,
      props.metadata,
      props.createdAt,
      props.updatedAt,
    );
  }

  // ── Pure derived queries (no mutation) ────────────────────────────────

  supportsCurrency(currency: string): boolean {
    if (this.defaultCurrency === null) {
      return false;
    }
    return this.defaultCurrency === currency;
  }
}
