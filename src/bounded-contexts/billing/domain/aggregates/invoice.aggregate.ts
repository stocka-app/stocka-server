import { AggregateRoot } from '@shared/domain/base/aggregate-root';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { CannotIssueManualInvoiceForStripeSubscriptionException } from '@billing/domain/exceptions/business/cannot-issue-manual-invoice-for-stripe-subscription.exception';
import { InvoiceAlreadyPaidException } from '@billing/domain/exceptions/business/invoice-already-paid.exception';
import { InvoiceCannotBeRetriedException } from '@billing/domain/exceptions/business/invoice-cannot-be-retried.exception';
import { InvoiceIssuedManuallyEvent } from '@billing/domain/events/invoice-issued-manually.event';
import { InvoicePaidEvent } from '@billing/domain/events/invoice-paid.event';
import { InvoicePaymentFailedEvent } from '@billing/domain/events/invoice-payment-failed.event';
import { InvoiceVoidedEvent } from '@billing/domain/events/invoice-voided.event';
import { InvoiceModel } from '@billing/domain/models/invoice.model';
import { BillingModeVO } from '@billing/domain/value-objects/billing-mode.vo';
import {
  InvoiceStatusEnum,
  InvoiceStatusVO,
} from '@billing/domain/value-objects/invoice-status.vo';
import { MoneyVO } from '@billing/domain/value-objects/money.vo';
import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';

export interface IssueProps {
  subscriptionId: number;
  tenantUUID: string;
  provider: PaymentProviderCodeVO;
  externalInvoiceId: string;
  amount: MoneyVO;
  periodStart: Date;
  periodEnd: Date;
}

export interface IssueManualProps {
  subscriptionId: number;
  tenantUUID: string;
  subscriptionBillingMode: BillingModeVO;
  provider: PaymentProviderCodeVO | null;
  externalReference: string;
  amount: MoneyVO;
  periodStart: Date;
  periodEnd: Date;
  initialStatus: InvoiceStatusVO;
  paidAt: Date | null;
  actorUUID: string;
}

/**
 * Aggregate root for a billing invoice. Identity (uuid, externalInvoiceId,
 * subscriptionId, period, amount) is fixed at construction; only the
 * payment lifecycle (status, paidAt, attemptCount) mutates after.
 *
 * Two creation paths:
 *
 *   - `issue(props)` is the automatic path — invoked when Stripe webhook
 *     `invoice.created` arrives for a STRIPE_SUBSCRIPTION. Status is OPEN
 *     and the customer will be charged by Stripe per the configured
 *     Smart Retries policy.
 *
 *   - `issueManual(props)` is the admin path for ENTERPRISE Patrón B
 *     (Stripe Invoicing) and Patrón C (Manual). The handler must pass
 *     `subscriptionBillingMode` from the linked SubscriptionAggregate;
 *     the factory rejects if mode is STRIPE_SUBSCRIPTION (those receive
 *     invoices automatically via webhook, manual issuance would create
 *     duplicates).
 *
 * Lifecycle transitions:
 *
 *   OPEN ─► PAID            (markPaid: webhook invoice.paid)
 *   OPEN ─► UNCOLLECTIBLE   (markUncollectible: dunning exhausted)
 *   OPEN ─► VOID            (markVoided: admin cancellation)
 *   OPEN ─► OPEN            (markPaymentFailed: attemptCount++)
 *   UNCOLLECTIBLE ─► VOID   (markVoided: write-off)
 */
export class InvoiceAggregate extends AggregateRoot {
  private _model: InvoiceModel;

  private constructor(model: InvoiceModel) {
    super();
    this._model = model;
  }

  // ── Factories ─────────────────────────────────────────────────────────

  static issue(props: IssueProps): InvoiceAggregate {
    const model = InvoiceModel.create({
      subscriptionId: props.subscriptionId,
      tenantUUID: props.tenantUUID,
      provider: props.provider,
      externalInvoiceId: props.externalInvoiceId,
      amount: props.amount,
      status: InvoiceStatusVO.open(),
      periodStart: props.periodStart,
      periodEnd: props.periodEnd,
    });
    return new InvoiceAggregate(model);
  }

  static issueManual(props: IssueManualProps): Result<InvoiceAggregate, DomainException> {
    if (props.subscriptionBillingMode.isStripeSubscription()) {
      return err(new CannotIssueManualInvoiceForStripeSubscriptionException(props.tenantUUID));
    }
    if (props.initialStatus.isPaid() && props.paidAt === null) {
      return err(
        new InvoiceAlreadyPaidException(
          'manual invoice cannot be initialStatus=PAID without paidAt',
        ),
      );
    }
    if (!props.initialStatus.isPaid() && props.paidAt !== null) {
      return err(
        new InvoiceCannotBeRetriedException(
          'manual',
          `initialStatus=${props.initialStatus.toString()} but paidAt was provided`,
        ),
      );
    }
    if (!props.initialStatus.isOpen() && !props.initialStatus.isPaid()) {
      return err(
        new InvoiceCannotBeRetriedException(
          'manual',
          `initialStatus must be OPEN or PAID, got ${props.initialStatus.toString()}`,
        ),
      );
    }
    const model = InvoiceModel.create({
      subscriptionId: props.subscriptionId,
      tenantUUID: props.tenantUUID,
      provider: props.provider,
      externalInvoiceId: props.externalReference,
      amount: props.amount,
      status: props.initialStatus,
      periodStart: props.periodStart,
      periodEnd: props.periodEnd,
      paidAt: props.paidAt,
    });
    const aggregate = new InvoiceAggregate(model);
    aggregate.apply(
      new InvoiceIssuedManuallyEvent(
        model.uuid.toString(),
        model.subscriptionId,
        model.tenantUUID.toString(),
        props.amount.getAmountInCents(),
        props.amount.getCurrency(),
        props.periodStart,
        props.periodEnd,
        props.externalReference,
        props.actorUUID,
      ),
    );
    return ok(aggregate);
  }

  static reconstitute(model: InvoiceModel): InvoiceAggregate {
    return new InvoiceAggregate(model);
  }

  // ── State transitions ────────────────────────────────────────────────

  markPaid(at: Date): Result<void, DomainException> {
    if (this._model.status.isPaid()) {
      return err(new InvoiceAlreadyPaidException(this._model.uuid.toString()));
    }
    if (this._model.status.getValue() !== InvoiceStatusEnum.OPEN) {
      return err(
        new InvoiceCannotBeRetriedException(
          this._model.uuid.toString(),
          this._model.status.toString(),
        ),
      );
    }
    this._model = this._model.with({
      status: InvoiceStatusVO.paid(),
      paidAt: at,
    });
    this.apply(
      new InvoicePaidEvent(
        this._model.uuid.toString(),
        this._model.subscriptionId,
        this._model.tenantUUID.toString(),
        this._model.amount.getAmountInCents(),
        this._model.amount.getCurrency(),
        at,
      ),
    );
    return ok(undefined);
  }

  markPaymentFailed(errorReason: string | null = null): Result<void, DomainException> {
    if (this._model.status.getValue() !== InvoiceStatusEnum.OPEN) {
      return err(
        new InvoiceCannotBeRetriedException(
          this._model.uuid.toString(),
          this._model.status.toString(),
        ),
      );
    }
    const nextAttemptCount = this._model.attemptCount + 1;
    this._model = this._model.with({
      attemptCount: nextAttemptCount,
    });
    this.apply(
      new InvoicePaymentFailedEvent(
        this._model.uuid.toString(),
        this._model.subscriptionId,
        this._model.tenantUUID.toString(),
        nextAttemptCount,
        errorReason,
      ),
    );
    return ok(undefined);
  }

  markUncollectible(): Result<void, DomainException> {
    if (this._model.status.getValue() !== InvoiceStatusEnum.OPEN) {
      return err(
        new InvoiceCannotBeRetriedException(
          this._model.uuid.toString(),
          this._model.status.toString(),
        ),
      );
    }
    this._model = this._model.with({
      status: InvoiceStatusVO.uncollectible(),
    });
    return ok(undefined);
  }

  markVoided(reason: string): Result<void, DomainException> {
    if (!this._model.status.isOpen() && !this._model.status.isUncollectible()) {
      return err(
        new InvoiceCannotBeRetriedException(
          this._model.uuid.toString(),
          this._model.status.toString(),
        ),
      );
    }
    this._model = this._model.with({
      status: InvoiceStatusVO.void_(),
    });
    this.apply(
      new InvoiceVoidedEvent(
        this._model.uuid.toString(),
        this._model.subscriptionId,
        this._model.tenantUUID.toString(),
        reason,
      ),
    );
    return ok(undefined);
  }

  // ── Queries / read access ─────────────────────────────────────────────

  get status(): InvoiceStatusVO {
    return this._model.status;
  }

  get amount(): MoneyVO {
    return this._model.amount;
  }

  get model(): InvoiceModel {
    return this._model;
  }

  get uuid(): string {
    return this._model.uuid.toString();
  }

  get id(): number | undefined {
    return this._model.id;
  }

  get subscriptionId(): number {
    return this._model.subscriptionId;
  }

  isPaid(): boolean {
    return this._model.isPaid();
  }

  isOpen(): boolean {
    return this._model.isOpen();
  }

  isTerminal(): boolean {
    return this._model.isTerminal();
  }

  requiresRetry(maxAttempts: number): boolean {
    return this._model.requiresRetry(maxAttempts);
  }
}
