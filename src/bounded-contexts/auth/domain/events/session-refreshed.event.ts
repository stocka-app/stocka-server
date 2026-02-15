import { IEvent } from '@nestjs/cqrs';

export class SessionRefreshedEvent implements IEvent {
  constructor(
    public readonly oldSessionUUID: string,
    public readonly newSessionUUID: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
