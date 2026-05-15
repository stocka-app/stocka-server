import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';

export enum PaymentProviderEventStatusEnum {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}

export class InvalidPaymentProviderEventStatusException extends DomainException {
  constructor(value: string) {
    super(
      `Invalid payment provider event status: ${value}`,
      'INVALID_PAYMENT_PROVIDER_EVENT_STATUS',
      [{ field: 'status', message: `Invalid payment provider event status: ${value}` }],
    );
  }
}

export class PaymentProviderEventStatusVO extends EnumValueObject<PaymentProviderEventStatusEnum> {
  constructor(value: string) {
    super(value, Object.values(PaymentProviderEventStatusEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidPaymentProviderEventStatusException(value);
  }

  isReceived(): boolean {
    return this._value === PaymentProviderEventStatusEnum.RECEIVED;
  }

  isProcessing(): boolean {
    return this._value === PaymentProviderEventStatusEnum.PROCESSING;
  }

  isProcessed(): boolean {
    return this._value === PaymentProviderEventStatusEnum.PROCESSED;
  }

  isFailed(): boolean {
    return this._value === PaymentProviderEventStatusEnum.FAILED;
  }

  isIgnored(): boolean {
    return this._value === PaymentProviderEventStatusEnum.IGNORED;
  }

  isPending(): boolean {
    return this.isReceived() || this.isProcessing();
  }

  isTerminal(): boolean {
    return this.isProcessed() || this.isFailed() || this.isIgnored();
  }

  static received(): PaymentProviderEventStatusVO {
    return new PaymentProviderEventStatusVO(PaymentProviderEventStatusEnum.RECEIVED);
  }

  static processing(): PaymentProviderEventStatusVO {
    return new PaymentProviderEventStatusVO(PaymentProviderEventStatusEnum.PROCESSING);
  }

  static processed(): PaymentProviderEventStatusVO {
    return new PaymentProviderEventStatusVO(PaymentProviderEventStatusEnum.PROCESSED);
  }

  static failed(): PaymentProviderEventStatusVO {
    return new PaymentProviderEventStatusVO(PaymentProviderEventStatusEnum.FAILED);
  }

  static ignored(): PaymentProviderEventStatusVO {
    return new PaymentProviderEventStatusVO(PaymentProviderEventStatusEnum.IGNORED);
  }
}
