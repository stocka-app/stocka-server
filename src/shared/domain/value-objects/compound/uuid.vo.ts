import { v4 as uuidv4, validate } from 'uuid';
import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

class InvalidUuidException extends DomainException {
  constructor(value: string) {
    super(`Invalid UUID: ${value}`, 'INVALID_UUID', [
      { field: 'uuid', message: 'Invalid UUID format' },
    ]);
  }
}

export class UuidVO extends CompoundVO {
  private readonly value: string;

  constructor(value?: string) {
    super();
    this.value = value ?? uuidv4();
    this.ensureValid();
  }

  private ensureValid(): void {
    if (!validate(this.value)) {
      throw new InvalidUuidException(this.value);
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: UuidVO): boolean {
    if (!(other instanceof UuidVO)) {
      return false;
    }
    return this.value === other.value;
  }
}
