export enum MemberRoleEnum {
  OWNER = 'OWNER',
  PARTNER = 'PARTNER',
  MANAGER = 'MANAGER',
  BUYER = 'BUYER',
  WAREHOUSE_KEEPER = 'WAREHOUSE_KEEPER',
  SALES_REP = 'SALES_REP',
  VIEWER = 'VIEWER',
}

export class MemberRoleVO {
  private readonly _value: MemberRoleEnum;

  private constructor(value: MemberRoleEnum) {
    this._value = value;
  }

  static fromString(value: string): MemberRoleVO {
    const normalized = value as MemberRoleEnum;
    if (!Object.values(MemberRoleEnum).includes(normalized)) {
      throw new Error(`Invalid MemberRole value: ${value}`);
    }
    return new MemberRoleVO(normalized);
  }

  static owner(): MemberRoleVO {
    return new MemberRoleVO(MemberRoleEnum.OWNER);
  }

  static viewer(): MemberRoleVO {
    return new MemberRoleVO(MemberRoleEnum.VIEWER);
  }

  isOwner(): boolean {
    return this._value === MemberRoleEnum.OWNER;
  }

  isPartner(): boolean {
    return this._value === MemberRoleEnum.PARTNER;
  }

  isManager(): boolean {
    return this._value === MemberRoleEnum.MANAGER;
  }

  equals(other: MemberRoleVO): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
