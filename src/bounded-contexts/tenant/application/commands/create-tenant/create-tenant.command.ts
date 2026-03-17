import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class CreateTenantCommand {
  constructor(
    public readonly userId: number,
    public readonly userUUID: string,
    public readonly name: string,
    public readonly businessType: string,
    public readonly country: string,
    public readonly timezone: string,
  ) {}
}

export type CreateTenantCommandResult = Result<{ tenantUUID: string }, DomainException>;
