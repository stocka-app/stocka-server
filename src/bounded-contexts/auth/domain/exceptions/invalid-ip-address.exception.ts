import { DomainException } from '@/shared/domain/exceptions/domain.exception';

export class InvalidIpAddressException extends DomainException {
  constructor(value: string) {
    super(`Invalid IP address: ${value}`, 'INVALID_IP_ADDRESS', [
      { field: 'ipAddress', message: 'Invalid IP address format' },
    ]);
  }
}
