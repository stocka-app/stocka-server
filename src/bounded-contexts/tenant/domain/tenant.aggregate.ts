import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { SlugVO } from '@tenant/domain/value-objects/slug.vo';
import { BusinessTypeVO } from '@tenant/domain/value-objects/business-type.vo';
import { TenantStatusVO } from '@tenant/domain/value-objects/tenant-status.vo';
import { TenantCreatedEvent } from '@tenant/domain/events/tenant-created.event';

export interface CreateTenantProps {
  name: string;
  slug: SlugVO;
  businessType: BusinessTypeVO;
  country: string;
  timezone: string;
  ownerUserId: number;
}

export interface TenantAggregateReconstituteProps extends AggregateRootProps {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  businessType: string;
  country: string;
  timezone: string;
  status: string;
  ownerUserId: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class TenantAggregate extends AggregateRoot {
  private _name: string;
  private readonly _slug: SlugVO;
  private readonly _businessType: BusinessTypeVO;
  private readonly _country: string;
  private readonly _timezone: string;
  private _status: TenantStatusVO;
  private readonly _ownerUserId: number;

  private constructor(
    props: AggregateRootProps & {
      name: string;
      slug: SlugVO;
      businessType: BusinessTypeVO;
      country: string;
      timezone: string;
      status: TenantStatusVO;
      ownerUserId: number;
    },
  ) {
    super(props);
    this._name = props.name;
    this._slug = props.slug;
    this._businessType = props.businessType;
    this._country = props.country;
    this._timezone = props.timezone;
    this._status = props.status;
    this._ownerUserId = props.ownerUserId;
  }

  static create(props: CreateTenantProps): TenantAggregate {
    const aggregate = new TenantAggregate({
      name: props.name,
      slug: props.slug,
      businessType: props.businessType,
      country: props.country,
      timezone: props.timezone,
      status: TenantStatusVO.active(),
      ownerUserId: props.ownerUserId,
    });

    aggregate.apply(
      new TenantCreatedEvent(
        aggregate.uuid,
        String(props.ownerUserId),
        props.name,
        props.slug.toString(),
      ),
    );

    return aggregate;
  }

  static reconstitute(props: TenantAggregateReconstituteProps): TenantAggregate {
    return new TenantAggregate({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
      name: props.name,
      slug: SlugVO.fromString(props.slug),
      businessType: BusinessTypeVO.fromString(props.businessType),
      country: props.country,
      timezone: props.timezone,
      status: TenantStatusVO.fromString(props.status),
      ownerUserId: props.ownerUserId,
    });
  }

  get name(): string {
    return this._name;
  }

  get slug(): string {
    return this._slug.toString();
  }

  get businessType(): string {
    return this._businessType.toString();
  }

  get country(): string {
    return this._country;
  }

  get timezone(): string {
    return this._timezone;
  }

  get status(): string {
    return this._status.toString();
  }

  get ownerUserId(): number {
    return this._ownerUserId;
  }

  updateName(name: string): void {
    this._name = name;
    this.touch();
  }

  suspend(): void {
    if (this._status.isCancelled()) {
      throw new Error('Cannot suspend a cancelled tenant');
    }
    this._status = TenantStatusVO.suspended();
    this.touch();
  }

  cancel(): void {
    if (this._status.isCancelled()) {
      throw new Error('Tenant is already cancelled');
    }
    this._status = TenantStatusVO.cancelled();
    this.touch();
  }

  isActive(): boolean {
    return this._status.isActive();
  }
}
