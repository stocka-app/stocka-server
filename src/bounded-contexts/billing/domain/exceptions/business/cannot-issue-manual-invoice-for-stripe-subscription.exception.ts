import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class CannotIssueManualInvoiceForStripeSubscriptionException extends BusinessLogicException {
  constructor(subscriptionUUID: string) {
    super(
      `Cannot issue manual invoice for subscription ${subscriptionUUID}: Stripe subscriptions invoice automatically`,
      'CANNOT_ISSUE_MANUAL_INVOICE_FOR_STRIPE_SUBSCRIPTION',
      [
        {
          field: 'billingMode',
          message:
            'Manual issuance is only allowed in MANUAL or STRIPE_INVOICING modes; STRIPE_SUBSCRIPTION receives invoices via webhook',
        },
      ],
    );
  }
}
