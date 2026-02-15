import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';
import { InvalidIpAddressException } from '@auth/domain/exceptions/invalid-ip-address.exception';

export class IPv6AddressVO extends StringVO {
  private static readonly HEX_GROUP = /^[0-9a-f]{1,4}$/;

  constructor(value: string) {
    super(value.trim().toLowerCase());
    this.ensureValid();
  }

  private static validateIPv6(value: string): boolean {
    // Handle the special case of "::"
    if (value === '::') return true;

    const halves = value.split('::');

    // At most one "::" is allowed
    if (halves.length > 2) return false;

    if (halves.length === 2) {
      return IPv6AddressVO.validateCompressedIPv6(halves[0], halves[1]);
    }

    // No "::" — must have exactly 8 groups
    const groups = value.split(':');
    return groups.length === 8 && groups.every((g) => IPv6AddressVO.HEX_GROUP.test(g));
  }

  private static validateCompressedIPv6(left: string, right: string): boolean {
    const leftGroups = left === '' ? [] : left.split(':');
    const rightGroups = right === '' ? [] : right.split(':');
    const totalGroups = leftGroups.length + rightGroups.length;

    // The compressed groups must fill up to 8 total, so combined must be < 8
    if (totalGroups >= 8) return false;

    return (
      leftGroups.every((g) => IPv6AddressVO.HEX_GROUP.test(g)) &&
      rightGroups.every((g) => IPv6AddressVO.HEX_GROUP.test(g))
    );
  }

  protected ensureValid(): void {
    if (!IPv6AddressVO.validateIPv6(this.value)) {
      throw new InvalidIpAddressException(this.value);
    }
  }

  static isValid(value: string): boolean {
    return IPv6AddressVO.validateIPv6(value.trim().toLowerCase());
  }
}
