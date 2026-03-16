import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';

export interface IEmailVerificationTokenContract {
  findById(id: number): Promise<EmailVerificationTokenModel | null>;
  findByUUID(uuid: string): Promise<EmailVerificationTokenModel | null>;
  findActiveByCredentialAccountId(credentialAccountId: number): Promise<EmailVerificationTokenModel | null>;
  findByCodeHash(codeHash: string): Promise<EmailVerificationTokenModel | null>;
  persist(token: EmailVerificationTokenModel): Promise<EmailVerificationTokenModel>;
  archive(uuid: string): Promise<void>;
  archiveAllByCredentialAccountId(credentialAccountId: number): Promise<void>;
  countResentInLastHour(credentialAccountId: number): Promise<number>;
  destroy(uuid: string): Promise<void>;
}
