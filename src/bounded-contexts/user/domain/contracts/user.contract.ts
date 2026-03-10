import { UserAggregate } from '@user/domain/models/user.aggregate';

export interface IUserContract {
  findById(id: number): Promise<UserAggregate | null>;
  findByUUID(uuid: string): Promise<UserAggregate | null>;
  findByEmail(email: string): Promise<UserAggregate | null>;
  findByUsername(username: string): Promise<UserAggregate | null>;
  findByEmailOrUsername(identifier: string): Promise<UserAggregate | null>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
  persist(user: UserAggregate): Promise<UserAggregate>;
  archive(uuid: string): Promise<void>;
  destroy(uuid: string): Promise<void>;
  destroyStaleUnverifiedUsers(olderThanDays: number): Promise<number>;
}
