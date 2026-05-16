/**
 * Sum type of webhook events the Anti-Corruption Layer translates from
 * raw provider payloads (Stripe today) into domain-typed commands. The
 * billing domain code never imports from the `stripe` lib — it consumes
 * `DomainWebhookCommand` exclusively, so swapping providers in the
 * future is contained to the adapter implementation.
 *
 * Each variant is discriminated by `type`; consumers narrow with a
 * `switch (cmd.type)`.
 */

export interface CommitUpgradeCommand {
  type: 'COMMIT_UPGRADE';
  stripeSubscriptionId: string;
  customerId: string;
  priceId: string;
  pricingPlanId: number;
  period: { start: Date; end: Date };
}

export interface RenewSubscriptionCommand {
  type: 'RENEW_SUBSCRIPTION';
  stripeSubscriptionId: string;
  period: { start: Date; end: Date };
}

export interface PaymentFailedCommand {
  type: 'PAYMENT_FAILED';
  stripeSubscriptionId: string;
  attemptCount: number;
  nextRetryAt: Date | null;
  errorReason: string | null;
}

export interface InvoiceIssuedCommand {
  type: 'INVOICE_ISSUED';
  stripeInvoiceId: string;
  stripeSubscriptionId: string;
  amountInCents: bigint;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface InvoicePaidCommand {
  type: 'INVOICE_PAID';
  stripeInvoiceId: string;
  paidAt: Date;
}

export interface SubscriptionDeletedCommand {
  type: 'SUBSCRIPTION_DELETED';
  stripeSubscriptionId: string;
  cancellationReason: 'unpaid' | 'requested_by_customer' | 'other';
}

export type DomainWebhookCommand =
  | CommitUpgradeCommand
  | RenewSubscriptionCommand
  | PaymentFailedCommand
  | InvoiceIssuedCommand
  | InvoicePaidCommand
  | SubscriptionDeletedCommand;
