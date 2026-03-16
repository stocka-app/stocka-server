import { SessionAggregate } from '@user/account/session/domain/session.aggregate';

export interface ISessionAggregateContract {
  findById(id: number): Promise<SessionAggregate | null>;
  findByUUID(uuid: string): Promise<SessionAggregate | null>;
  findByTokenHash(tokenHash: string): Promise<SessionAggregate | null>;
  findActiveByAccountId(accountId: number): Promise<SessionAggregate[]>;
  persist(session: SessionAggregate): Promise<SessionAggregate>;
  archive(uuid: string): Promise<void>;
  archiveAllByAccountId(accountId: number): Promise<void>;
  destroy(uuid: string): Promise<void>;
}
