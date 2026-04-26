import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { UserCreatedEvent } from '@user/domain/events/user-created.event';

export interface UserAggregateReconstitueProps {
  id: number;
  uuid: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class UserAggregate extends AggregateRoot {
  private constructor(props?: AggregateRootProps) {
    super(props);
  }

  static create(): UserAggregate {
    const user = new UserAggregate();
    user.apply(new UserCreatedEvent(user.uuid, '', ''));
    return user;
  }

  static reconstitute(props: UserAggregateReconstitueProps): UserAggregate {
    return new UserAggregate(props);
  }
}
