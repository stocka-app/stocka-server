import { PasswordResetTokenAggregate } from '@authentication/domain/aggregates/password-reset-token.aggregate';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface IPasswordResetTokenContract {
  findById(id: number): Promise<Persisted<PasswordResetTokenAggregate> | null>;
  findByUUID(uuid: string): Promise<Persisted<PasswordResetTokenAggregate> | null>;
  findByTokenHash(tokenHash: string): Promise<Persisted<PasswordResetTokenAggregate> | null>;
  persist(token: PasswordResetTokenAggregate): Promise<Persisted<PasswordResetTokenAggregate>>;
  archive(uuid: string): Promise<void>;
}
