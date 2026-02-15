import { IEvent } from '@nestjs/cqrs';

export class UserCreatedEvent implements IEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
    public readonly username: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
