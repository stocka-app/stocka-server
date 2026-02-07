import { IEvent } from '@nestjs/cqrs';

export class EmailVerificationRequestedEvent implements IEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly code: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
