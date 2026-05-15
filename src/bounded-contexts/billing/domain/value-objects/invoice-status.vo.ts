import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';
import { InvalidInvoiceStatusException } from '@billing/domain/exceptions/validation/invalid-invoice-status.exception';

export enum InvoiceStatusEnum {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
  VOID = 'VOID',
}

export class InvoiceStatusVO extends EnumValueObject<InvoiceStatusEnum> {
  constructor(value: string) {
    super(value, Object.values(InvoiceStatusEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidInvoiceStatusException(value);
  }

  isDraft(): boolean {
    return this._value === InvoiceStatusEnum.DRAFT;
  }

  isOpen(): boolean {
    return this._value === InvoiceStatusEnum.OPEN;
  }

  isPaid(): boolean {
    return this._value === InvoiceStatusEnum.PAID;
  }

  isUncollectible(): boolean {
    return this._value === InvoiceStatusEnum.UNCOLLECTIBLE;
  }

  isVoid(): boolean {
    return this._value === InvoiceStatusEnum.VOID;
  }

  isTerminal(): boolean {
    return (
      this._value === InvoiceStatusEnum.PAID ||
      this._value === InvoiceStatusEnum.UNCOLLECTIBLE ||
      this._value === InvoiceStatusEnum.VOID
    );
  }

  static draft(): InvoiceStatusVO {
    return new InvoiceStatusVO(InvoiceStatusEnum.DRAFT);
  }

  static open(): InvoiceStatusVO {
    return new InvoiceStatusVO(InvoiceStatusEnum.OPEN);
  }

  static paid(): InvoiceStatusVO {
    return new InvoiceStatusVO(InvoiceStatusEnum.PAID);
  }

  static uncollectible(): InvoiceStatusVO {
    return new InvoiceStatusVO(InvoiceStatusEnum.UNCOLLECTIBLE);
  }

  static void_(): InvoiceStatusVO {
    return new InvoiceStatusVO(InvoiceStatusEnum.VOID);
  }
}
