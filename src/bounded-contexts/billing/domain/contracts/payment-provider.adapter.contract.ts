import { Result } from '@shared/domain/result';
import { ExternalProviderException } from '@billing/domain/exceptions/business/external-provider.exception';
import { DomainWebhookCommand } from '@billing/domain/contracts/domain-webhook-command';

/**
 * Anti-Corruption Layer contract for payment providers. Stripe is the
 * concrete implementation today; PAYPAL and MERCADOPAGO will plug in
 * via additional implementations of this same interface in the future.
 *
 * The domain code under `billing/domain/` NEVER imports from a provider
 * SDK. All interaction goes through this contract:
 *   - Inputs are domain-typed (string IDs, MoneyVO-derived primitives)
 *   - Outputs are domain-typed (no Stripe `Subscription` objects)
 *   - Webhook payloads are parsed into `DomainWebhookCommand` (sum
 *     type) before reaching domain code
 *
 * Implementations live in `billing/infrastructure/stripe/` (Fase 3 —
 * plan 04). The handler layer (Fases 4-9) consumes this contract.
 */
export interface IPaymentProvider {
  /**
   * Creates an external customer record (Stripe Customer). Idempotent
   * on `tenantUUID` via provider-side metadata or our own DB cache.
   */
  createCustomer(input: {
    email: string;
    name: string;
    tenantUUID: string;
  }): Promise<Result<{ customerId: string }, ExternalProviderException>>;

  /**
   * Creates a Stripe Checkout Session for an upgrade. Returns the
   * URL the frontend redirects the user to. `successPath` / `cancelPath`
   * are relative paths (the adapter prefixes with the host from
   * FRONTEND_URL at call time).
   */
  createCheckoutSession(input: {
    customerId: string;
    priceId: string;
    successPath: string;
    cancelPath: string;
    metadata: { tenantUUID: string; targetTier: string };
  }): Promise<Result<{ sessionId: string; url: string }, ExternalProviderException>>;

  /**
   * Creates a recurring subscription directly via API (admin flow for
   * ENTERPRISE Pattern A). Self-service uses `createCheckoutSession`
   * instead and reacts to the webhook.
   */
  createSubscription(input: {
    customerId: string;
    priceId: string;
    prorationBehavior: 'create_prorations' | 'none';
  }): Promise<
    Result<
      {
        subscriptionId: string;
        status: string;
        currentPeriod: { start: Date; end: Date };
      },
      ExternalProviderException
    >
  >;

  /**
   * Switches the subscription to a different price (upgrade/downgrade
   * between paid tiers without canceling). Used by `applyPendingDowngrade`
   * when target is not FREE.
   */
  updateSubscriptionPrice(input: {
    subscriptionId: string;
    newPriceId: string;
    prorationBehavior: 'create_prorations' | 'none';
  }): Promise<Result<{ status: string }, ExternalProviderException>>;

  /**
   * Cancels a Stripe subscription. `atPeriodEnd=true` keeps service
   * until current period closes; `false` cancels immediately (admin /
   * dunning use only).
   */
  cancelSubscription(input: {
    subscriptionId: string;
    atPeriodEnd: boolean;
  }): Promise<Result<{ cancelAt: Date }, ExternalProviderException>>;

  /**
   * Returns a one-time URL to the Stripe Customer Portal where the
   * customer can manage payment methods, view invoices, etc.
   */
  createCustomerPortalSession(input: {
    customerId: string;
    returnPath: string;
  }): Promise<Result<{ url: string }, ExternalProviderException>>;

  /**
   * Verifies the webhook signature and translates the raw provider
   * payload into a domain command. Returns `err` if the signature is
   * invalid (subclass of ExternalProviderException) — the webhook
   * controller responds 401 and Stripe will retry.
   *
   * Concrete subclass (e.g. `WebhookSignatureInvalidException`) lives
   * in `billing/infrastructure/stripe/exceptions/`.
   */
  parseWebhookEvent(input: {
    payload: Buffer;
    signature: string;
  }): Result<DomainWebhookCommand, ExternalProviderException>;
}
