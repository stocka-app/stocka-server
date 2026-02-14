import { StringVO } from '@/shared/domain/value-objects/primitive/string.vo';
import { DomainException } from '@/shared/domain/exceptions/domain.exception';

class InvalidIpAddressException extends DomainException {
  constructor(value: string) {
    super(`Invalid IP address: ${value}`, 'INVALID_IP_ADDRESS', [
      { field: 'ipAddress', message: 'Invalid IP address format' },
    ]);
  }
}

export class IpAddressVO extends StringVO {
  private static readonly IPV4_PATTERN =
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

  private static readonly IPV6_PATTERN =
    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^::$/;

  constructor(value: string) {
    super(value.trim());
    this.ensureValid();
  }

  protected ensureValid(): void {
    if (!IpAddressVO.IPV4_PATTERN.test(this.value) && !IpAddressVO.IPV6_PATTERN.test(this.value)) {
      throw new InvalidIpAddressException(this.value);
    }
  }

  isIPv4(): boolean {
    return IpAddressVO.IPV4_PATTERN.test(this.value);
  }

  isIPv6(): boolean {
    return IpAddressVO.IPV6_PATTERN.test(this.value);
  }
}
