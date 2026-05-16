import { DomainEvent } from '@shared/domain/base/domain-event';

export class InvoiceVoidedEvent extends DomainEvent {
  constructor(
    public readonly invoiceUUID: string,
    public readonly subscriptionId: number,
    public readonly tenantUUID: string,
    public readonly reason: string,
  ) {
    super();
  }
}
