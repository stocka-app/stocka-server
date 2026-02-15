import { IEvent } from '@nestjs/cqrs';

export class EmailVerificationFailedEvent implements IEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
    public readonly ipAddress: string,
    public readonly failedAttempts: number,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
