import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { InvalidMoneyAmountException } from '@billing/domain/exceptions/validation/invalid-money-amount.exception';
import { InvalidMoneyDecimalFormatException } from '@billing/domain/exceptions/validation/invalid-money-decimal-format.exception';
import { UnsupportedCurrencyException } from '@billing/domain/exceptions/validation/unsupported-currency.exception';
import { CurrencyMismatchException } from '@billing/domain/exceptions/business/currency-mismatch.exception';
import { NegativeMultiplierException } from '@billing/domain/exceptions/business/negative-multiplier.exception';

const SUPPORTED_CURRENCIES = new Set<string>(['MXN']);
const DECIMAL_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/**
 * Monetary amount with currency-aware arithmetic.
 *
 * Internally stores the amount as `bigint` cents to avoid IEEE-754 rounding
 * errors that bite floating-point arithmetic (e.g. `0.1 + 0.2 !== 0.3`).
 * The schema stores `NUMERIC(10, 2)`; the persistence mapper is responsible
 * for converting between DB string/numeric and cents.
 *
 * Construction is via factories — never `new`:
 *   - `MoneyVO.fromCents(19900n, 'MXN')` for internal flows (mapper, tests)
 *   - `MoneyVO.fromDecimal('199.00', 'MXN')` for user input parsing
 *
 * Operations are exception-driven, not Result-returning: invalid combinations
 * (different currencies, negative multipliers) are programming errors, not
 * domain flows. The caller controls the inputs.
 */
export class MoneyVO extends CompoundVO {
  private readonly _amountInCents: bigint;
  private readonly _currency: string;

  private constructor(amountInCents: bigint, currency: string) {
    super();
    this._amountInCents = amountInCents;
    this._currency = currency;
    this.ensureValid();
  }

  private ensureValid(): void {
    if (this._amountInCents < 0n) {
      throw new InvalidMoneyAmountException(this._amountInCents.toString());
    }
    if (!SUPPORTED_CURRENCIES.has(this._currency)) {
      throw new UnsupportedCurrencyException(this._currency);
    }
  }

  static fromCents(amount: bigint, currency: string): MoneyVO {
    return new MoneyVO(amount, currency);
  }

  static fromDecimal(amount: string, currency: string): MoneyVO {
    if (!DECIMAL_PATTERN.test(amount)) {
      throw new InvalidMoneyDecimalFormatException(amount);
    }
    const [whole, fractional = ''] = amount.split('.');
    const paddedFractional = fractional.padEnd(2, '0').slice(0, 2);
    const cents =
      BigInt(whole) * 100n + BigInt(paddedFractional) * (whole.startsWith('-') ? -1n : 1n);
    return new MoneyVO(cents, currency);
  }

  static zero(currency: string): MoneyVO {
    return new MoneyVO(0n, currency);
  }

  getAmountInCents(): bigint {
    return this._amountInCents;
  }

  getCurrency(): string {
    return this._currency;
  }

  isZero(): boolean {
    return this._amountInCents === 0n;
  }

  add(other: MoneyVO): MoneyVO {
    if (this._currency !== other._currency) {
      throw new CurrencyMismatchException(this._currency, other._currency);
    }
    return new MoneyVO(this._amountInCents + other._amountInCents, this._currency);
  }

  multiply(factor: number): MoneyVO {
    if (factor < 0) {
      throw new NegativeMultiplierException(factor);
    }
    const scale = 1_000_000;
    const scaledFactor = BigInt(Math.round(factor * scale));
    const scaledResult = (this._amountInCents * scaledFactor) / BigInt(scale);
    return new MoneyVO(scaledResult, this._currency);
  }

  toString(): string {
    const whole = this._amountInCents / 100n;
    const fractional = (this._amountInCents % 100n).toString().padStart(2, '0');
    return `${whole}.${fractional} ${this._currency}`;
  }

  format(locale: string = 'es-MX'): string {
    const decimal = Number(this._amountInCents) / 100;
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this._currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatter.format(decimal)} ${this._currency}`;
  }

  equals(other: MoneyVO): boolean {
    if (!(other instanceof MoneyVO)) {
      return false;
    }
    return this._amountInCents === other._amountInCents && this._currency === other._currency;
  }
}
