import { UserAggregate } from '@user/domain/models/user.aggregate';

export interface IUserContract {
  findById(id: number): Promise<UserAggregate | null>;
  findByUUID(uuid: string): Promise<UserAggregate | null>;
  existsByUsername(username: string): Promise<boolean>;
  persist(user: UserAggregate): Promise<UserAggregate>;
  archive(uuid: string): Promise<void>;
  destroy(uuid: string): Promise<void>;
}
