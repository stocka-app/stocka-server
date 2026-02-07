import { IEvent } from '@nestjs/cqrs';

export class UserSignedOutEvent implements IEvent {
  constructor(
    public readonly userUuid: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
