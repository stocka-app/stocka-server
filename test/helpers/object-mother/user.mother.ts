import { UserModel } from '@/user/domain/models/user.model';

export class UserMother {
  static create(overrides: Partial<{
    id: number;
    uuid: string;
    email: string;
    username: string;
    passwordHash: string | null;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
  }> = {}): UserModel {
    const defaults = {
      id: 1,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.z9OYHvJpzZ9y7u', // "Password1"
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      archivedAt: null,
    };

    const props = { ...defaults, ...overrides };

    return UserModel.reconstitute({
      id: props.id,
      uuid: props.uuid,
      email: props.email,
      username: props.username,
      passwordHash: props.passwordHash,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
  }

  static createArchived(overrides: Partial<{
    id: number;
    uuid: string;
    email: string;
    username: string;
    passwordHash: string | null;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date;
  }> = {}): UserModel {
    return this.create({
      ...overrides,
      archivedAt: overrides.archivedAt ?? new Date('2024-06-01T00:00:00Z'),
    });
  }

  static createSocialOnly(overrides: Partial<{
    id: number;
    uuid: string;
    email: string;
    username: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
  }> = {}): UserModel {
    return this.create({
      ...overrides,
      passwordHash: null,
    });
  }

  static createWithEmail(email: string): UserModel {
    return this.create({ email });
  }

  static createWithUsername(username: string): UserModel {
    return this.create({ username });
  }
}
