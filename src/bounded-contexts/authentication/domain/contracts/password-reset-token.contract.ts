import { PasswordResetTokenModel } from '@authentication/domain/models/password-reset-token.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface IPasswordResetTokenContract {
  findById(id: number): Promise<Persisted<PasswordResetTokenModel> | null>;
  findByUUID(uuid: string): Promise<Persisted<PasswordResetTokenModel> | null>;
  findByTokenHash(tokenHash: string): Promise<Persisted<PasswordResetTokenModel> | null>;
  persist(token: PasswordResetTokenModel): Promise<Persisted<PasswordResetTokenModel>>;
  archive(uuid: string): Promise<void>;
}
