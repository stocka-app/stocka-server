import { EmailVerificationTokenAggregate } from '@authentication/domain/aggregates/email-verification-token.aggregate';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface IEmailVerificationTokenContract {
  findById(id: number): Promise<Persisted<EmailVerificationTokenAggregate> | null>;
  findByUUID(uuid: string): Promise<Persisted<EmailVerificationTokenAggregate> | null>;
  findActiveByCredentialAccountId(
    credentialAccountId: number,
  ): Promise<Persisted<EmailVerificationTokenAggregate> | null>;
  findByCodeHash(codeHash: string): Promise<Persisted<EmailVerificationTokenAggregate> | null>;
  persist(
    token: EmailVerificationTokenAggregate,
  ): Promise<Persisted<EmailVerificationTokenAggregate>>;
  archive(uuid: string): Promise<void>;
  archiveAllByCredentialAccountId(credentialAccountId: number): Promise<void>;
  countResentInLastHour(credentialAccountId: number): Promise<number>;
  destroy(uuid: string): Promise<void>;
}
