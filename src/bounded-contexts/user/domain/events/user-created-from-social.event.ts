import { IEvent } from '@nestjs/cqrs';

export class UserCreatedFromSocialEvent implements IEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
    public readonly provider: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
