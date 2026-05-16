import { DomainEvent } from '@shared/domain/base/domain-event';

export class InvoicePaidEvent extends DomainEvent {
  constructor(
    public readonly invoiceUUID: string,
    public readonly subscriptionId: number,
    public readonly tenantUUID: string,
    public readonly amountInCents: bigint,
    public readonly currency: string,
    public readonly paidAt: Date,
  ) {
    super();
  }
}
