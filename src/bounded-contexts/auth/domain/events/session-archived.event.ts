import { IEvent } from '@nestjs/cqrs';

export class SessionArchivedEvent implements IEvent {
  constructor(
    public readonly sessionUuid: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
