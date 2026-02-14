import { StringVO } from '@/shared/domain/value-objects/primitive/string.vo';
import { InvalidIpAddressException } from '@/auth/domain/exceptions/invalid-ip-address.exception';

export class Ipv6AddressVO extends StringVO {
  private static readonly PATTERN =
    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^::$/;

  constructor(value: string) {
    super(value.trim().toLowerCase());
    this.ensureValid();
  }

  protected ensureValid(): void {
    if (!Ipv6AddressVO.PATTERN.test(this.value)) {
      throw new InvalidIpAddressException(this.value);
    }
  }

  static isValid(value: string): boolean {
    return Ipv6AddressVO.PATTERN.test(value.trim().toLowerCase());
  }
}
