import { UserConsentEntity } from '@user/infrastructure/persistence/entities/user-consent.entity';

export interface IUserConsentContract {
  recordConsents(consents: UserConsentEntity[]): Promise<void>;
  findLatestByUser(userUUID: string): Promise<UserConsentEntity[]>;
}
