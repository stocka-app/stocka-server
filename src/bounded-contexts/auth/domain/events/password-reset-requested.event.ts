import { IEvent } from '@nestjs/cqrs';

export class PasswordResetRequestedEvent implements IEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
