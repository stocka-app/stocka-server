import { IEvent } from '@nestjs/cqrs';

export class AccountBecameFlexibleEvent implements IEvent {
  constructor(
    public readonly userUUID: string,
    public readonly provider: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
