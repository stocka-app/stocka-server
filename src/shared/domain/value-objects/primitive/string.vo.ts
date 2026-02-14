import { PrimitiveVO } from '@shared/domain/value-objects/primitive/primitive.vo';

export abstract class StringVO extends PrimitiveVO<string> {
  constructor(value: string) {
    super(value);
  }
}
