import { IEvent } from '@nestjs/cqrs';

export class SessionCreatedEvent implements IEvent {
  constructor(
    public readonly sessionUUID: string,
    public readonly accountId: number,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
