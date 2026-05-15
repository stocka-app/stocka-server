import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';

export enum PaymentProviderCodeEnum {
  STRIPE = 'STRIPE',
  // PAYPAL = 'PAYPAL' — reserved for future
  // MERCADOPAGO = 'MERCADOPAGO' — reserved for future
}

export class InvalidPaymentProviderCodeException extends DomainException {
  constructor(value: string) {
    super(`Invalid payment provider code: ${value}`, 'INVALID_PAYMENT_PROVIDER_CODE', [
      { field: 'providerCode', message: `Invalid payment provider code: ${value}` },
    ]);
  }
}

export class PaymentProviderCodeVO extends EnumValueObject<PaymentProviderCodeEnum> {
  constructor(value: string) {
    super(value, Object.values(PaymentProviderCodeEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidPaymentProviderCodeException(value);
  }

  isStripe(): boolean {
    return this._value === PaymentProviderCodeEnum.STRIPE;
  }

  static stripe(): PaymentProviderCodeVO {
    return new PaymentProviderCodeVO(PaymentProviderCodeEnum.STRIPE);
  }
}
