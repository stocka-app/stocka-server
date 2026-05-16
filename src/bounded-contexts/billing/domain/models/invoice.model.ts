import { v7 as uuidV7 } from 'uuid';
import { BaseModel } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { InvoiceStatusVO } from '@billing/domain/value-objects/invoice-status.vo';
import { MoneyVO } from '@billing/domain/value-objects/money.vo';
import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';

export interface InvoiceModelCreateProps {
  subscriptionId: number;
  tenantUUID: string;
  provider: PaymentProviderCodeVO | null;
  externalInvoiceId: string;
  amount: MoneyVO;
  status: InvoiceStatusVO;
  periodStart: Date;
  periodEnd: Date;
  paidAt?: Date | null;
}

export interface InvoiceModelReconstituteProps {
  id: number;
  uuid: UUIDVO;
  subscriptionId: number;
  tenantUUID: UUIDVO;
  provider: PaymentProviderCodeVO | null;
  externalInvoiceId: string;
  amount: MoneyVO;
  status: InvoiceStatusVO;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date | null;
  attemptCount: number;
  metadata: Record<string, unknown> | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceModelChanges {
  status?: InvoiceStatusVO;
  paidAt?: Date | null;
  attemptCount?: number;
  metadata?: Record<string, unknown> | null;
  archivedAt?: Date | null;
  updatedAt?: Date;
}

/**
 * Pure data carrier for an Invoice. Identity (uuid, externalInvoiceId,
 * subscriptionId, period boundaries, amount) is fixed at construction;
 * only the payment lifecycle (`status`, `paidAt`, `attemptCount`) mutates
 * via `with()`.
 *
 * `provider` is nullable: Patrón C (manual billing) records invoices
 * without a payment provider, using `externalInvoiceId` as a free-form
 * reference (folio CFDI, PO number, wire transfer ID).
 *
 * NOTE: the `billing.invoices` table currently has `provider_code NOT NULL`,
 * which conflicts with the Patrón C (MANUAL) use case where `provider` is
 * null. A follow-up migration should relax this to nullable so manual
 * invoices can be persisted; until then, only Stripe-backed invoices can
 * round-trip through the DB.
 */
export class InvoiceModel extends BaseModel {
  constructor(
    public readonly uuid: UUIDVO,
    public readonly subscriptionId: number,
    public readonly tenantUUID: UUIDVO,
    public readonly provider: PaymentProviderCodeVO | null,
    public readonly externalInvoiceId: string,
    public readonly amount: MoneyVO,
    public readonly status: InvoiceStatusVO,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly paidAt: Date | null,
    public readonly attemptCount: number,
    public readonly metadata: Record<string, unknown> | null,
    public readonly archivedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly id?: number,
  ) {
    super();
  }

  static create(props: InvoiceModelCreateProps): InvoiceModel {
    const now = new Date();
    return new InvoiceModel(
      new UUIDVO(uuidV7()),
      props.subscriptionId,
      new UUIDVO(props.tenantUUID),
      props.provider,
      props.externalInvoiceId,
      props.amount,
      props.status,
      props.periodStart,
      props.periodEnd,
      props.paidAt ?? null,
      0,
      null,
      null,
      now,
      now,
    );
  }

  static reconstitute(props: InvoiceModelReconstituteProps): InvoiceModel {
    return new InvoiceModel(
      props.uuid,
      props.subscriptionId,
      props.tenantUUID,
      props.provider,
      props.externalInvoiceId,
      props.amount,
      props.status,
      props.periodStart,
      props.periodEnd,
      props.paidAt,
      props.attemptCount,
      props.metadata,
      props.archivedAt,
      props.createdAt,
      props.updatedAt,
      props.id,
    );
  }

  with(changes: InvoiceModelChanges): InvoiceModel {
    return new InvoiceModel(
      this.uuid,
      this.subscriptionId,
      this.tenantUUID,
      this.provider,
      this.externalInvoiceId,
      this.amount,
      changes.status ?? this.status,
      this.periodStart,
      this.periodEnd,
      changes.paidAt !== undefined ? changes.paidAt : this.paidAt,
      changes.attemptCount ?? this.attemptCount,
      changes.metadata !== undefined ? changes.metadata : this.metadata,
      changes.archivedAt !== undefined ? changes.archivedAt : this.archivedAt,
      this.createdAt,
      changes.updatedAt ?? new Date(),
      this.id,
    );
  }

  // ── Pure derived queries (no mutation) ────────────────────────────────

  isPaid(): boolean {
    return this.status.isPaid() && this.paidAt !== null;
  }

  isOpen(): boolean {
    return this.status.isOpen();
  }

  isTerminal(): boolean {
    return this.status.isTerminal();
  }

  requiresRetry(maxAttempts: number): boolean {
    return this.status.isOpen() && this.attemptCount < maxAttempts;
  }
}
