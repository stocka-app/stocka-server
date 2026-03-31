import { SessionAggregate } from '@user/account/session/domain/session.aggregate';
import { CredentialSessionModel } from '@user/account/session/domain/models/credential-session.model';
import { SocialSessionModel } from '@user/account/session/domain/models/social-session.model';

export interface ISessionContract {
  findById(id: number): Promise<SessionAggregate | null>;
  findByUUID(uuid: string): Promise<SessionAggregate | null>;
  findByTokenHash(tokenHash: string): Promise<SessionAggregate | null>;
  findActiveByAccountId(accountId: number): Promise<SessionAggregate[]>;
  persist(session: SessionAggregate): Promise<SessionAggregate>;
  persistWithCredential(
    session: SessionAggregate,
    credentialSession: CredentialSessionModel,
  ): Promise<SessionAggregate>;
  persistWithSocial(
    session: SessionAggregate,
    socialSession: SocialSessionModel,
  ): Promise<SessionAggregate>;
  archive(uuid: string): Promise<void>;
  archiveAllByAccountId(accountId: number): Promise<void>;
  destroy(uuid: string): Promise<void>;
}
