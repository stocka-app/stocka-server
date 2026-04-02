import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface IEmailVerificationTokenContract {
  findById(id: number): Promise<Persisted<EmailVerificationTokenModel> | null>;
  findByUUID(uuid: string): Promise<Persisted<EmailVerificationTokenModel> | null>;
  findActiveByCredentialAccountId(
    credentialAccountId: number,
  ): Promise<Persisted<EmailVerificationTokenModel> | null>;
  findByCodeHash(codeHash: string): Promise<Persisted<EmailVerificationTokenModel> | null>;
  persist(token: EmailVerificationTokenModel): Promise<Persisted<EmailVerificationTokenModel>>;
  archive(uuid: string): Promise<void>;
  archiveAllByCredentialAccountId(credentialAccountId: number): Promise<void>;
  countResentInLastHour(credentialAccountId: number): Promise<number>;
  destroy(uuid: string): Promise<void>;
}
