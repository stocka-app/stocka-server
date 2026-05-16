import { InvoiceAggregate } from '@billing/domain/aggregates/invoice.aggregate';
import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';

export interface InvoicePagination {
  limit: number;
  offset: number;
}

/**
 * Repository contract for `InvoiceAggregate`. Supports webhook
 * idempotency lookups (find by external invoice id), dunning queries
 * (find unpaid by subscription), and customer-facing history queries.
 */
export interface IInvoiceRepository {
  save(aggregate: InvoiceAggregate): Promise<InvoiceAggregate>;

  findByUUID(uuid: string): Promise<InvoiceAggregate | null>;

  /**
   * Idempotency lookup for Stripe webhooks: if an invoice with the same
   * `(provider, externalInvoiceId)` already exists, the webhook handler
   * acts on it rather than creating a duplicate.
   */
  findByExternalInvoiceId(
    provider: PaymentProviderCodeVO,
    externalInvoiceId: string,
  ): Promise<InvoiceAggregate | null>;

  /** Unpaid invoices for a subscription — feeds dunning policy decisions. */
  findUnpaidBySubscription(subscriptionId: number): Promise<InvoiceAggregate[]>;

  /** Paginated history for customer-facing billing pages. */
  findBySubscription(
    subscriptionId: number,
    pagination: InvoicePagination,
  ): Promise<InvoiceAggregate[]>;
}
