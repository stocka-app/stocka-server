import { DomainEvent } from '@shared/domain/base/domain-event';

export class InvoiceIssuedManuallyEvent extends DomainEvent {
  constructor(
    public readonly invoiceUUID: string,
    public readonly subscriptionId: number,
    public readonly tenantUUID: string,
    public readonly amountInCents: bigint,
    public readonly currency: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly externalReference: string,
    public readonly actorUUID: string,
  ) {
    super();
  }
}
