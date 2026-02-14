import { EmailVerificationTokenModel } from '@auth/domain/models/email-verification-token.model';

export interface IEmailVerificationTokenContract {
  findById(id: number): Promise<EmailVerificationTokenModel | null>;
  findByUuid(uuid: string): Promise<EmailVerificationTokenModel | null>;
  findActiveByUserId(userId: number): Promise<EmailVerificationTokenModel | null>;
  findByCodeHash(codeHash: string): Promise<EmailVerificationTokenModel | null>;
  persist(token: EmailVerificationTokenModel): Promise<EmailVerificationTokenModel>;
  archive(uuid: string): Promise<void>;
  archiveAllByUserId(userId: number): Promise<void>;
  countResentInLastHour(userId: number): Promise<number>;
  destroy(uuid: string): Promise<void>;
}
