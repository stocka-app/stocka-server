import { IEvent } from '@nestjs/cqrs';

export class EmailVerificationCompletedEvent implements IEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
