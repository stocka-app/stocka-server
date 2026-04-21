import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class TenantNameVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): TenantNameVO {
    return new TenantNameVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Tenant name cannot be empty');
    }
    if (this.value.length > TenantNameVO.MAX_LENGTH) {
      throw new Error(`Tenant name cannot exceed ${TenantNameVO.MAX_LENGTH} characters`);
    }
  }
}
