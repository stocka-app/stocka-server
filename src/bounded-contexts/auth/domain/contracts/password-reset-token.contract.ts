import { PasswordResetTokenModel } from '@auth/domain/models/password-reset-token.model';

export interface IPasswordResetTokenContract {
  findById(id: number): Promise<PasswordResetTokenModel | null>;
  findByUuid(uuid: string): Promise<PasswordResetTokenModel | null>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenModel | null>;
  persist(token: PasswordResetTokenModel): Promise<PasswordResetTokenModel>;
  archive(uuid: string): Promise<void>;
}
