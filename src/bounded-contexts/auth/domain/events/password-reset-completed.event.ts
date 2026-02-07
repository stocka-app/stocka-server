import { IEvent } from '@nestjs/cqrs';

export class PasswordResetCompletedEvent implements IEvent {
  constructor(
    public readonly userId: number,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
