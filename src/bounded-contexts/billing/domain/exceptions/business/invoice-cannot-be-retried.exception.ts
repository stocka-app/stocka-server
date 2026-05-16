import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvoiceCannotBeRetriedException extends BusinessLogicException {
  constructor(invoiceUUID: string, currentStatus: string) {
    super(
      `Invoice ${invoiceUUID} cannot be retried (current status: ${currentStatus})`,
      'INVOICE_CANNOT_BE_RETRIED',
      [
        {
          field: 'status',
          message: `Retry is only valid for OPEN invoices, found ${currentStatus}`,
        },
      ],
    );
  }
}
