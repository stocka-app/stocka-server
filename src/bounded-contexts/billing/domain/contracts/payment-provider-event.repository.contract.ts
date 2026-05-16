import { PaymentProviderEventModel } from '@billing/domain/models/payment-provider-event.model';
import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';

/**
 * Webhook idempotency log + raw payload archive. Each row corresponds to
 * a single `(provider, externalEventId)` pair (UNIQUE constraint).
 *
 * Lifecycle: inserted on receipt with `status = RECEIVED`, then transitioned
 * to PROCESSED / FAILED / IGNORED by the webhook handler. The repo exposes
 * the status transitions as direct methods rather than going through an
 * aggregate, because `PaymentProviderEventModel` is intentionally not an
 * aggregate (no invariants beyond the simple status sequence).
 */
export interface IPaymentProviderEventRepository {
  /**
   * Idempotent insert: returns `false` if a row with the same
   * `(provider, externalEventId)` already exists, `true` if newly inserted.
   * Webhook handler uses the return value to short-circuit duplicate
   * Stripe deliveries.
   */
  insert(event: PaymentProviderEventModel): Promise<boolean>;

  findByExternalId(
    provider: PaymentProviderCodeVO,
    externalEventId: string,
  ): Promise<PaymentProviderEventModel | null>;

  /** Marks the row as PROCESSED and stamps `processedAt = now`. Idempotent. */
  markProcessed(provider: PaymentProviderCodeVO, externalEventId: string): Promise<void>;

  /** Marks the row as FAILED, stamps `processedAt = now`, records errorMessage. */
  markFailed(
    provider: PaymentProviderCodeVO,
    externalEventId: string,
    errorMessage: string,
  ): Promise<void>;

  /**
   * Marks the row as IGNORED — for event types we don't care about
   * (e.g. Stripe sends `charge.captured` but we only care about
   * `invoice.paid`). Stamps `processedAt = now`.
   */
  markIgnored(provider: PaymentProviderCodeVO, externalEventId: string): Promise<void>;
}
