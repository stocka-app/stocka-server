import { UserAggregate } from '@user/domain/aggregates/user.aggregate';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface IUserContract {
  findById(id: number): Promise<Persisted<UserAggregate> | null>;
  findByUUID(uuid: string): Promise<Persisted<UserAggregate> | null>;
  existsByUsername(username: string): Promise<boolean>;
  persist(user: UserAggregate): Promise<Persisted<UserAggregate>>;
  archive(uuid: string): Promise<void>;
  destroy(uuid: string): Promise<void>;
}
