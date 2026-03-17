export enum BusinessTypeEnum {
  RETAIL = 'retail',
  WHOLESALE = 'wholesale',
  FOOD = 'food',
  SERVICES = 'services',
  MANUFACTURING = 'manufacturing',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  TECH = 'tech',
  OTHER = 'other',
}

export class BusinessTypeVO {
  private readonly _value: BusinessTypeEnum;

  private constructor(value: BusinessTypeEnum) {
    this._value = value;
  }

  static fromString(value: string): BusinessTypeVO {
    const normalized = value as BusinessTypeEnum;
    if (!Object.values(BusinessTypeEnum).includes(normalized)) {
      throw new Error(`Invalid BusinessType value: ${value}`);
    }
    return new BusinessTypeVO(normalized);
  }

  equals(other: BusinessTypeVO): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
