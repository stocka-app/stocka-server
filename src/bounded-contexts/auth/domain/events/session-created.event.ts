import { IEvent } from '@nestjs/cqrs';

export class SessionCreatedEvent implements IEvent {
  constructor(
    public readonly sessionUUID: string,
    public readonly userId: number,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
