import { UserModel } from '@user/domain/models/user.model';

export interface IUserContract {
  findById(id: number): Promise<UserModel | null>;
  findByUuid(uuid: string): Promise<UserModel | null>;
  findByEmail(email: string): Promise<UserModel | null>;
  findByUsername(username: string): Promise<UserModel | null>;
  findByEmailOrUsername(identifier: string): Promise<UserModel | null>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
  persist(user: UserModel): Promise<UserModel>;
  archive(uuid: string): Promise<void>;
  destroy(uuid: string): Promise<void>;
}
