import { CompoundVO } from '@/shared/domain/value-objects/compound/compound.vo';

export class VerificationResultVO extends CompoundVO {
  private readonly _success: boolean;

  private constructor(success: boolean) {
    super();
    this._success = success;
  }

  isSuccessful(): boolean {
    return this._success;
  }

  isFailed(): boolean {
    return !this._success;
  }

  toString(): string {
    return this._success ? 'success' : 'failed';
  }

  equals(other: VerificationResultVO): boolean {
    if (!(other instanceof VerificationResultVO)) {
      return false;
    }
    return this._success === other._success;
  }

  static success(): VerificationResultVO {
    return new VerificationResultVO(true);
  }

  static failed(): VerificationResultVO {
    return new VerificationResultVO(false);
  }

  static fromBoolean(value: boolean): VerificationResultVO {
    return value ? VerificationResultVO.success() : VerificationResultVO.failed();
  }
}
