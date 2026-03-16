import { IEvent } from '@nestjs/cqrs';

export class PasswordResetCompletedEvent implements IEvent {
  constructor(
    public readonly credentialAccountId: number,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
