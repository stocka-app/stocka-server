import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidInvoiceStatusException extends DomainException {
  constructor(value: string) {
    super(`Invalid invoice status: ${value}`, 'INVALID_INVOICE_STATUS', [
      { field: 'status', message: `Invalid invoice status: ${value}` },
    ]);
  }
}
