import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvoiceNotFoundException extends BusinessLogicException {
  constructor(identifier: string) {
    super(`Invoice not found: ${identifier}`, 'INVOICE_NOT_FOUND', [
      { field: 'identifier', message: `No invoice matches ${identifier}` },
    ]);
  }
}
