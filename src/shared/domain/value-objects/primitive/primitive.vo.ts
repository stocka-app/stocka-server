import { ValueObject } from '@/shared/domain/value-objects/value-object';

export abstract class PrimitiveVO<T> extends ValueObject {
  protected readonly value: T;

  constructor(value: T) {
    super();
    this.value = value;
  }

  protected abstract ensureValid(): void;

  getValue(): T {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }

  equals(other: PrimitiveVO<T>): boolean {
    if (!(other instanceof PrimitiveVO)) {
      return false;
    }
    return this.value === other.value;
  }
}
