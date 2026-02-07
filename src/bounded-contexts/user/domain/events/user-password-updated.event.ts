import { IEvent } from '@nestjs/cqrs';

export class UserPasswordUpdatedEvent implements IEvent {
  constructor(
    public readonly userUuid: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
