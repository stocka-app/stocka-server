export enum MemberStatusEnum {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export class MemberStatusVO {
  private readonly _value: MemberStatusEnum;

  private constructor(value: MemberStatusEnum) {
    this._value = value;
  }

  static fromString(value: string): MemberStatusVO {
    const normalized = value as MemberStatusEnum;
    if (!Object.values(MemberStatusEnum).includes(normalized)) {
      throw new Error(`Invalid MemberStatus value: ${value}`);
    }
    return new MemberStatusVO(normalized);
  }

  static active(): MemberStatusVO {
    return new MemberStatusVO(MemberStatusEnum.ACTIVE);
  }

  static pending(): MemberStatusVO {
    return new MemberStatusVO(MemberStatusEnum.PENDING);
  }

  static suspended(): MemberStatusVO {
    return new MemberStatusVO(MemberStatusEnum.SUSPENDED);
  }

  isActive(): boolean {
    return this._value === MemberStatusEnum.ACTIVE;
  }

  isPending(): boolean {
    return this._value === MemberStatusEnum.PENDING;
  }

  isSuspended(): boolean {
    return this._value === MemberStatusEnum.SUSPENDED;
  }

  equals(other: MemberStatusVO): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
