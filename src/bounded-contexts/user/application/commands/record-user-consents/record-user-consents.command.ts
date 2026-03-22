import { ICommand } from '@nestjs/cqrs';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export interface RecordUserConsentsPayload {
  terms: boolean;
  marketing: boolean;
  analytics: boolean;
}

export class RecordUserConsentsCommand implements ICommand {
  constructor(
    public readonly userUUID: string,
    public readonly consents: RecordUserConsentsPayload,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
  ) {}
}

export type RecordUserConsentsResult = Result<void, DomainException>;
