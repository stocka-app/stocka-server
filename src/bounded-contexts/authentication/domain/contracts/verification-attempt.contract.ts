import { VerificationAttemptAggregate } from '@authentication/domain/aggregates/verification-attempt.aggregate';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface IVerificationAttemptContract {
  findById(id: number): Promise<Persisted<VerificationAttemptAggregate> | null>;
  findByUUID(uuid: string): Promise<Persisted<VerificationAttemptAggregate> | null>;
  persist(attempt: VerificationAttemptAggregate): Promise<Persisted<VerificationAttemptAggregate>>;

  // Rate limiting queries
  countFailedByUserUUIDInLastHour(userUUID: string): Promise<number>;
  countFailedByUserUUIDInLast24Hours(userUUID: string): Promise<number>;
  countFailedByIpAddressInLastHour(ipAddress: string): Promise<number>;
  countFailedByEmailInLastHour(email: string): Promise<number>;

  // Rate limiting queries filtered by attempt type
  countFailedByIpAddressInLastHourByType(
    ipAddress: string,
    verificationType: string,
  ): Promise<number>;

  countFailedByIdentifierInLastHourByType(
    identifier: string,
    verificationType: string,
  ): Promise<number>;

  countFailedByUserUUIDInLastHourByType(
    userUUID: string,
    verificationType: string,
  ): Promise<number>;

  // For analysis
  findRecentByUserUUID(
    userUUID: string,
    limit: number,
  ): Promise<Persisted<VerificationAttemptAggregate>[]>;

  // Cleanup
  archiveOlderThan(date: Date): Promise<number>;
}
