import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';

export enum BillingCycleEnum {
  MONTHLY = 'MONTHLY',
  // YEARLY = 'YEARLY' — reserved for future
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export class InvalidBillingCycleException extends DomainException {
  constructor(value: string) {
    super(`Invalid billing cycle: ${value}`, 'INVALID_BILLING_CYCLE', [
      { field: 'billingCycle', message: `Invalid billing cycle: ${value}` },
    ]);
  }
}

export class BillingCycleVO extends EnumValueObject<BillingCycleEnum> {
  constructor(value: string) {
    super(value, Object.values(BillingCycleEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidBillingCycleException(value);
  }

  isMonthly(): boolean {
    return this._value === BillingCycleEnum.MONTHLY;
  }

  /**
   * Approximate interval in days used for cron scheduling and reporting.
   * Real period boundaries come from the payment provider (Stripe) which is
   * the authoritative source for `currentPeriodStart` / `currentPeriodEnd`.
   */
  intervalInDays(): number {
    switch (this._value) {
      case BillingCycleEnum.MONTHLY:
        return 30;
    }
  }

  /**
   * Convenience helper for projections and tests. NOT a substitute for the
   * provider's actual period end — Stripe handles month-edge cases (e.g.
   * Jan 31 → Feb 28) that this approximation does not.
   */
  nextPeriodEnd(from: Date): Date {
    return new Date(from.getTime() + this.intervalInDays() * MS_PER_DAY);
  }

  static monthly(): BillingCycleVO {
    return new BillingCycleVO(BillingCycleEnum.MONTHLY);
  }
}
