import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class StorageColorVO extends StringVO {
  private static readonly HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): StorageColorVO {
    return new StorageColorVO(value.trim());
  }

  protected ensureValid(): void {
    if (!StorageColorVO.HEX_PATTERN.test(this.value)) {
      throw new Error('Storage color must be a valid hex color (e.g. #1A2B3C)');
    }
  }
}
