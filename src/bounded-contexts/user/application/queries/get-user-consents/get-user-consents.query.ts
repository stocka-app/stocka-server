import { IQuery } from '@nestjs/cqrs';

export interface UserConsentStatusDto {
  consentType: string;
  granted: boolean;
  documentVersion: string;
  grantedAt: string;
}

export class GetUserConsentsQuery implements IQuery {
  constructor(public readonly userUUID: string) {}
}

export type GetUserConsentsQueryResult = UserConsentStatusDto[];
