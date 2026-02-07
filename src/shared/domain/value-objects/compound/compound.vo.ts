import { ValueObject } from '@/shared/domain/value-objects/value-object';

export abstract class CompoundVO extends ValueObject {
  abstract toString(): string;
}
