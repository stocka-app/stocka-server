import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvoiceAlreadyPaidException extends BusinessLogicException {
  constructor(invoiceUUID: string) {
    super(`Invoice ${invoiceUUID} is already paid`, 'INVOICE_ALREADY_PAID', [
      { field: 'status', message: 'Invoice has already been marked as PAID' },
    ]);
  }
}
