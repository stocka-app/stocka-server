import { SessionModel } from '@authentication/domain/models/session.model';

export interface ISessionContract {
  findById(id: number): Promise<SessionModel | null>;
  findByUUID(uuid: string): Promise<SessionModel | null>;
  findByTokenHash(tokenHash: string): Promise<SessionModel | null>;
  findActiveByUserId(userId: number): Promise<SessionModel[]>;
  persist(session: SessionModel): Promise<SessionModel>;
  archive(uuid: string): Promise<void>;
  archiveAllByUserId(userId: number): Promise<void>;
  destroy(uuid: string): Promise<void>;
}
