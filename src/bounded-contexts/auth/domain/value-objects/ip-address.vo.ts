import { CompoundVO } from '@/shared/domain/value-objects/compound/compound.vo';
import { InvalidIpAddressException } from '@/auth/domain/exceptions/invalid-ip-address.exception';
import { Ipv4AddressVO } from '@/auth/domain/value-objects/ipv4-address.vo';
import { Ipv6AddressVO } from '@/auth/domain/value-objects/ipv6-address.vo';

export class IpAddressVO extends CompoundVO {
  private readonly _inner: Ipv4AddressVO | Ipv6AddressVO;

  private constructor(inner: Ipv4AddressVO | Ipv6AddressVO) {
    super();
    this._inner = inner;
  }

  static create(value: string): IpAddressVO {
    const trimmed = value.trim();

    if (Ipv4AddressVO.isValid(trimmed)) {
      return new IpAddressVO(new Ipv4AddressVO(trimmed));
    }

    if (Ipv6AddressVO.isValid(trimmed)) {
      return new IpAddressVO(new Ipv6AddressVO(trimmed));
    }

    throw new InvalidIpAddressException(trimmed);
  }

  static fromIpv4(value: string): IpAddressVO {
    return new IpAddressVO(new Ipv4AddressVO(value));
  }

  static fromIpv6(value: string): IpAddressVO {
    return new IpAddressVO(new Ipv6AddressVO(value));
  }

  isIPv4(): boolean {
    return this._inner instanceof Ipv4AddressVO;
  }

  isIPv6(): boolean {
    return this._inner instanceof Ipv6AddressVO;
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
