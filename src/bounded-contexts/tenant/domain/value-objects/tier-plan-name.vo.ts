import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class TierPlanNameVO extends StringVO {
  private static readonly MAX_LENGTH = 50;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): TierPlanNameVO {
    return new TierPlanNameVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Tier plan name cannot be empty');
    }
    if (this.value.length > TierPlanNameVO.MAX_LENGTH) {
      throw new Error(`Tier plan name cannot exceed ${TierPlanNameVO.MAX_LENGTH} characters`);
    }
  }
}
