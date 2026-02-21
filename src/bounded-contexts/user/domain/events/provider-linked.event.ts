import { IEvent } from '@nestjs/cqrs';

export class ProviderLinkedEvent implements IEvent {
  constructor(
    public readonly userUUID: string,
    public readonly provider: string,
    public readonly isFlexiblePending: boolean,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
