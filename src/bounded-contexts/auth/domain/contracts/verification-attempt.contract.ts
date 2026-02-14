import { VerificationAttemptModel } from '@auth/domain/models/verification-attempt.model';

export interface IVerificationAttemptContract {
  findById(id: number): Promise<VerificationAttemptModel | null>;
  findByUuid(uuid: string): Promise<VerificationAttemptModel | null>;
  persist(attempt: VerificationAttemptModel): Promise<VerificationAttemptModel>;

  // Rate limiting queries
  countFailedByUserUuidInLastHour(userUuid: string): Promise<number>;
  countFailedByUserUuidInLast24Hours(userUuid: string): Promise<number>;
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

  countFailedByUserUuidInLastHourByType(
    userUuid: string,
    verificationType: string,
  ): Promise<number>;

  // For analysis
  findRecentByUserUuid(userUuid: string, limit: number): Promise<VerificationAttemptModel[]>;

  // Cleanup
  archiveOlderThan(date: Date): Promise<number>;
}
