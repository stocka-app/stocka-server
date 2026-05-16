import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';
import { PaymentProviderEventStatusVO } from '@billing/domain/value-objects/payment-provider-event-status.vo';

export interface PaymentProviderEventModelCreateProps {
  provider: PaymentProviderCodeVO;
  externalEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  receivedAt?: Date;
}

export interface PaymentProviderEventModelReconstituteProps {
  id: number;
  provider: PaymentProviderCodeVO;
  externalEventId: string;
  eventType: string;
  receivedAt: Date;
  processedAt: Date | null;
  status: PaymentProviderEventStatusVO;
  errorMessage: string | null;
  payload: Record<string, unknown>;
}

export interface PaymentProviderEventModelChanges {
  status?: PaymentProviderEventStatusVO;
  processedAt?: Date | null;
  errorMessage?: string | null;
}

/**
 * Pure data carrier for a `billing.payment_provider_events` row — the raw
 * webhook idempotency log. Identity is `(provider, externalEventId)`, not
 * a uuid; PK is a SERIAL `id`. Does NOT extend `BaseModel` because the
 * schema has no `archivedAt` and no `created_at`/`updated_at` columns
 * (only `receivedAt` and `processedAt`).
 *
 * `eventType` is a free-form string (the provider's event identifier,
 * e.g. Stripe's `customer.subscription.updated`) — not wrapped in a VO
 * because the universe of values is large, vendor-controlled and
 * unstable across versions.
 *
 * Semantically near-append-only: the row is inserted on webhook receipt
 * with `status=RECEIVED`, then transitions via `with()` to PROCESSED /
 * FAILED / IGNORED. No further mutation is allowed once terminal.
 */
export class PaymentProviderEventModel {
  constructor(
    public readonly provider: PaymentProviderCodeVO,
    public readonly externalEventId: string,
    public readonly eventType: string,
    public readonly receivedAt: Date,
    public readonly processedAt: Date | null,
    public readonly status: PaymentProviderEventStatusVO,
    public readonly errorMessage: string | null,
    public readonly payload: Record<string, unknown>,
    public readonly id?: number,
  ) {}

  static create(props: PaymentProviderEventModelCreateProps): PaymentProviderEventModel {
    return new PaymentProviderEventModel(
      props.provider,
      props.externalEventId,
      props.eventType,
      props.receivedAt ?? new Date(),
      null,
      PaymentProviderEventStatusVO.received(),
      null,
      props.payload,
    );
  }

  static reconstitute(
    props: PaymentProviderEventModelReconstituteProps,
  ): PaymentProviderEventModel {
    return new PaymentProviderEventModel(
      props.provider,
      props.externalEventId,
      props.eventType,
      props.receivedAt,
      props.processedAt,
      props.status,
      props.errorMessage,
      props.payload,
      props.id,
    );
  }

  with(changes: PaymentProviderEventModelChanges): PaymentProviderEventModel {
    return new PaymentProviderEventModel(
      this.provider,
      this.externalEventId,
      this.eventType,
      this.receivedAt,
      changes.processedAt !== undefined ? changes.processedAt : this.processedAt,
      changes.status ?? this.status,
      changes.errorMessage !== undefined ? changes.errorMessage : this.errorMessage,
      this.payload,
      this.id,
    );
  }

  // ── Pure derived queries (no mutation) ────────────────────────────────

  isPending(): boolean {
    return this.status.isPending();
  }

  isTerminal(): boolean {
    return this.status.isTerminal();
  }
}
