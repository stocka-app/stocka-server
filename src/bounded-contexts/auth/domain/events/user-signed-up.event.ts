import { IEvent } from '@nestjs/cqrs';

export class UserSignedUpEvent implements IEvent {
  constructor(
    public readonly userUuid: string,
    public readonly email: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
