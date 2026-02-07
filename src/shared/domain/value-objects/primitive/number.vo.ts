import { PrimitiveVO } from '@/shared/domain/value-objects/primitive/primitive.vo';

export abstract class NumberVO extends PrimitiveVO<number> {
  constructor(value: number) {
    super(value);
  }
}
