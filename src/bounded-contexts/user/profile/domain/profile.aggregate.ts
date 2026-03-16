import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';

export interface ProfileAggregateProps extends AggregateRootProps {
  userId: number;
}

export interface ProfileAggregateReconstitueProps {
  id: number;
  uuid: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class ProfileAggregate extends AggregateRoot {
  private readonly _userId: number;

  private constructor(props: ProfileAggregateProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._userId = props.userId;
  }

  static create(props: { userId: number }): ProfileAggregate {
    return new ProfileAggregate({ userId: props.userId });
  }

  static reconstitute(props: ProfileAggregateReconstitueProps): ProfileAggregate {
    return new ProfileAggregate(props);
  }

  get userId(): number {
    return this._userId;
  }
}
