import { v4 as uuidV4, validate } from 'uuid';
import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

class InvalidUUIDException extends DomainException {
  constructor(value: string) {
    super(`Invalid UUID: ${value}`, 'INVALID_UUID', [
      { field: 'uuid', message: 'Invalid UUID format' },
    ]);
  }
}

export class UUIDVO extends CompoundVO {
  private readonly value: string;

  constructor(value?: string) {
    super();
    this.value = value ?? uuidV4();
    this.ensureValid();
  }

  private ensureValid(): void {
    if (!validate(this.value)) {
      throw new InvalidUUIDException(this.value);
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: UUIDVO): boolean {
    if (!(other instanceof UUIDVO)) {
      return false;
    }
    return this.value === other.value;
  }
}
