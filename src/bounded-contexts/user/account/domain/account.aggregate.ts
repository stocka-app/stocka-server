import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';

export interface AccountAggregateProps extends AggregateRootProps {
  userId: number;
}

export interface AccountAggregateReconstitueProps {
  id: number;
  uuid: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class AccountAggregate extends AggregateRoot {
  private readonly _userId: number;

  private constructor(props: AccountAggregateProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._userId = props.userId;
  }

  static create(props: { userId: number }): AccountAggregate {
    return new AccountAggregate({
      userId: props.userId,
    });
  }

  static reconstitute(props: AccountAggregateReconstitueProps): AccountAggregate {
    return new AccountAggregate(props);
  }

  get userId(): number {
    return this._userId;
  }
}
