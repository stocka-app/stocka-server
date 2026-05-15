import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';

export enum SubscriptionEventActorTypeEnum {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export class InvalidSubscriptionEventActorTypeException extends DomainException {
  constructor(value: string) {
    super(
      `Invalid subscription event actor type: ${value}`,
      'INVALID_SUBSCRIPTION_EVENT_ACTOR_TYPE',
      [{ field: 'actorType', message: `Invalid subscription event actor type: ${value}` }],
    );
  }
}

export class SubscriptionEventActorTypeVO extends EnumValueObject<SubscriptionEventActorTypeEnum> {
  constructor(value: string) {
    super(value, Object.values(SubscriptionEventActorTypeEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidSubscriptionEventActorTypeException(value);
  }

  isUser(): boolean {
    return this._value === SubscriptionEventActorTypeEnum.USER;
  }

  isSystem(): boolean {
    return this._value === SubscriptionEventActorTypeEnum.SYSTEM;
  }

  isProvider(): boolean {
    return this._value === SubscriptionEventActorTypeEnum.PROVIDER;
  }

  isAdmin(): boolean {
    return this._value === SubscriptionEventActorTypeEnum.ADMIN;
  }

  static user(): SubscriptionEventActorTypeVO {
    return new SubscriptionEventActorTypeVO(SubscriptionEventActorTypeEnum.USER);
  }

  static system(): SubscriptionEventActorTypeVO {
    return new SubscriptionEventActorTypeVO(SubscriptionEventActorTypeEnum.SYSTEM);
  }

  static provider(): SubscriptionEventActorTypeVO {
    return new SubscriptionEventActorTypeVO(SubscriptionEventActorTypeEnum.PROVIDER);
  }

  static admin(): SubscriptionEventActorTypeVO {
    return new SubscriptionEventActorTypeVO(SubscriptionEventActorTypeEnum.ADMIN);
  }
}
