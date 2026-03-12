import { IEvent } from '@nestjs/cqrs';

export class UserSignedInEvent implements IEvent {
  constructor(
    public readonly userUUID: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
