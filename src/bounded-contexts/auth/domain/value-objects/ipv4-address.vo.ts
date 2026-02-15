import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';
import { InvalidIpAddressException } from '@auth/domain/exceptions/invalid-ip-address.exception';

export class IPv4AddressVO extends StringVO {
  constructor(value: string) {
    super(value.trim());
    this.ensureValid();
  }

  private static isValidOctet(octet: string): boolean {
    if (!/^\d{1,3}$/.test(octet)) return false;
    const num = Number(octet);
    return num >= 0 && num <= 255;
  }

  private static validateIPv4(value: string): boolean {
    const parts = value.split('.');
    if (parts.length !== 4) return false;
    return parts.every((part) => IPv4AddressVO.isValidOctet(part));
  }

  protected ensureValid(): void {
    if (!IPv4AddressVO.validateIPv4(this.value)) {
      throw new InvalidIpAddressException(this.value);
    }
  }

  static isValid(value: string): boolean {
    return IPv4AddressVO.validateIPv4(value.trim());
  }
}
