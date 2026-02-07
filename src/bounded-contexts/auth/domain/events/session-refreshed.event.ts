import { IEvent } from '@nestjs/cqrs';

export class SessionRefreshedEvent implements IEvent {
  constructor(
    public readonly oldSessionUuid: string,
    public readonly newSessionUuid: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
