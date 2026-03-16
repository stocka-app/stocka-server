import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { AccountEntity } from '@user/account/infrastructure/entities/account.entity';

export class AccountMapper {
  static toDomain(entity: AccountEntity): AccountAggregate {
    return AccountAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      userId: entity.userId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: AccountAggregate): Partial<AccountEntity> {
    const entity: Partial<AccountEntity> = {
      uuid: model.uuid,
      userId: model.userId,
      archivedAt: model.archivedAt,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}
