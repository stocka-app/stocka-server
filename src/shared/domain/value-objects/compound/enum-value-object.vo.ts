import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

/**
 * Base for Value Objects that wrap a TypeScript enum with validation against
 * the set of allowed values. Centralizes the boilerplate (validation, getValue,
 * toString, equals) so each concrete enum-VO only declares its enum, its
 * `Invalid<X>Exception`, and its business-specific predicates and factories.
 *
 * Pattern: the subclass calls `super(value, Object.values(MyEnum))` and
 * implements `invalidException(value)` to return its concrete exception type.
 *
 * The `equals` check uses both value equality and constructor identity to
 * prevent false positives between two distinct enum-VOs that happen to share
 * an underlying value (e.g., `SubscriptionStatusVO.create('ACTIVE')` is never
 * equal to a different VO that also has an `ACTIVE` member).
 */
export abstract class EnumValueObject<T extends string> extends CompoundVO {
  protected readonly _value: T;

  protected constructor(value: string, validValues: readonly T[]) {
    super();
    if (!validValues.includes(value as T)) {
      throw this.invalidException(value);
    }
    this._value = value as T;
  }

  protected abstract invalidException(value: string): DomainException;

  getValue(): T {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: EnumValueObject<T>): boolean {
    if (!(other instanceof EnumValueObject)) {
      return false;
    }
    if (this.constructor !== other.constructor) {
      return false;
    }
    return this._value === other._value;
  }
}
