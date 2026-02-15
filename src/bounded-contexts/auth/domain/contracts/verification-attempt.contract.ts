import { VerificationAttemptModel } from '@auth/domain/models/verification-attempt.model';

export interface IVerificationAttemptContract {
  findById(id: number): Promise<VerificationAttemptModel | null>;
  findByUUID(uuid: string): Promise<VerificationAttemptModel | null>;
  persist(attempt: VerificationAttemptModel): Promise<VerificationAttemptModel>;

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
  findRecentByUserUUID(userUUID: string, limit: number): Promise<VerificationAttemptModel[]>;

  // Cleanup
  archiveOlderThan(date: Date): Promise<number>;
}
