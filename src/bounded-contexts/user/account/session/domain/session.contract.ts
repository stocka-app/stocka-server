import { SessionAggregate } from '@user/account/session/domain/session.aggregate';
import { CredentialSessionModel } from '@user/account/session/domain/models/credential-session.model';
import { SocialSessionModel } from '@user/account/session/domain/models/social-session.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface ISessionContract {
  findById(id: number): Promise<Persisted<SessionAggregate> | null>;
  findByUUID(uuid: string): Promise<Persisted<SessionAggregate> | null>;
  findByTokenHash(tokenHash: string): Promise<Persisted<SessionAggregate> | null>;
  findActiveByAccountId(accountId: number): Promise<Persisted<SessionAggregate>[]>;
  persist(session: SessionAggregate): Promise<Persisted<SessionAggregate>>;
  persistWithCredential(
    session: SessionAggregate,
    credentialSession: CredentialSessionModel,
  ): Promise<Persisted<SessionAggregate>>;
  persistWithSocial(
    session: SessionAggregate,
    socialSession: SocialSessionModel,
  ): Promise<Persisted<SessionAggregate>>;
  archive(uuid: string): Promise<void>;
  archiveAllByAccountId(accountId: number): Promise<void>;
  destroy(uuid: string): Promise<void>;
}
