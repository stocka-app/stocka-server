import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

/**
 * Abstract base for failures originating from an external payment provider
 * (Stripe today, PayPal/MercadoPago in the future). The infrastructure layer
 * defines concrete subclasses for each kind of failure:
 *
 *   - `WebhookSignatureException` (invalid signature)
 *   - `ProviderApiUnavailableException` (5xx / timeout)
 *   - `ProviderApiClientException` (4xx — auth, validation)
 *   - `ProviderRateLimitException` (429)
 *
 * Domain code never throws these directly — it only knows the base.
 * Concrete subclasses live in `billing/infrastructure/stripe/exceptions/`
 * (or equivalent for future providers).
 *
 * The Anti-Corruption Layer (plan 03 §2.11 D) translates raw provider SDK
 * errors into these typed exceptions so the application layer can branch
 * uniformly on `instanceof ExternalProviderException`.
 */
export abstract class ExternalProviderException extends BusinessLogicException {
  constructor(
    message: string,
    errorCode: string,
    details: { field: string; message: string }[] = [],
    metadata?: Record<string, unknown>,
  ) {
    super(message, errorCode, details, metadata);
  }
}
