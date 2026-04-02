import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class RoomTypeNameVO extends StringVO {
  private static readonly MAX_LENGTH = 50;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): RoomTypeNameVO {
    return new RoomTypeNameVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Room type name cannot be empty');
    }
    if (this.value.length > RoomTypeNameVO.MAX_LENGTH) {
      throw new Error(`Room type name cannot exceed ${RoomTypeNameVO.MAX_LENGTH} characters`);
    }
  }
}
