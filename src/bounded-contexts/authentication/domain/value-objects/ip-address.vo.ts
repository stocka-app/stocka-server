import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { InvalidIpAddressException } from '@authentication/domain/exceptions/invalid-ip-address.exception';
import { IPv4AddressVO } from '@authentication/domain/value-objects/ipv4-address.vo';
import { IPv6AddressVO } from '@authentication/domain/value-objects/ipv6-address.vo';

export class IpAddressVO extends CompoundVO {
  private readonly _inner: IPv4AddressVO | IPv6AddressVO;

  private constructor(inner: IPv4AddressVO | IPv6AddressVO) {
    super();
    this._inner = inner;
  }

  static create(value: string): IpAddressVO {
    const trimmed = value.trim();

    if (IPv4AddressVO.isValid(trimmed)) {
      return new IpAddressVO(new IPv4AddressVO(trimmed));
    }

    if (IPv6AddressVO.isValid(trimmed)) {
      return new IpAddressVO(new IPv6AddressVO(trimmed));
    }

    throw new InvalidIpAddressException(trimmed);
  }

  static fromIPv4(value: string): IpAddressVO {
    return new IpAddressVO(new IPv4AddressVO(value));
  }

  static fromIPv6(value: string): IpAddressVO {
    return new IpAddressVO(new IPv6AddressVO(value));
  }

  isIPv4(): boolean {
    return this._inner instanceof IPv4AddressVO;
  }

  isIPv6(): boolean {
    return this._inner instanceof IPv6AddressVO;
  }

  toString(): string {
    return this._inner.getValue();
  }

  equals(other: IpAddressVO): boolean {
    if (!(other instanceof IpAddressVO)) {
      return false;
    }
    return this._inner.getValue() === other._inner.getValue();
  }
}
