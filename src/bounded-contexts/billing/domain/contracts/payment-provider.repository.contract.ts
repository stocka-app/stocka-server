import { PaymentProviderModel } from '@billing/domain/models/payment-provider.model';
import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';

/**
 * Read-only repository for the payment-provider catalog. Providers are
 * seeded by migrations (STRIPE today, future: PAYPAL, MERCADOPAGO) and
 * toggled via `isEnabled` rather than mutated. Returns `PaymentProviderModel`.
 */
export interface IPaymentProviderRepository {
  findByCode(code: PaymentProviderCodeVO): Promise<PaymentProviderModel | null>;

  /**
   * All enabled providers (`isEnabled = true`). Used by handlers to
   * discover supported payment methods at runtime.
   */
  findAllEnabled(): Promise<PaymentProviderModel[]>;
}
