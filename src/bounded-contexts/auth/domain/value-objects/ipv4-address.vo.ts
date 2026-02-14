import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';
import { InvalidIpAddressException } from '@auth/domain/exceptions/invalid-ip-address.exception';

export class Ipv4AddressVO extends StringVO {
  private static readonly PATTERN =
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

  constructor(value: string) {
    super(value.trim());
    this.ensureValid();
  }

  protected ensureValid(): void {
    if (!Ipv4AddressVO.PATTERN.test(this.value)) {
      throw new InvalidIpAddressException(this.value);
    }
  }

  static isValid(value: string): boolean {
    return Ipv4AddressVO.PATTERN.test(value.trim());
  }
}
