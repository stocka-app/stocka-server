import { DomainEvent } from '@shared/domain/base/domain-event';

export class InvoicePaymentFailedEvent extends DomainEvent {
  constructor(
    public readonly invoiceUUID: string,
    public readonly subscriptionId: number,
    public readonly tenantUUID: string,
    public readonly attemptCount: number,
    public readonly errorReason: string | null,
  ) {
    super();
  }
}
