import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { SlugVO } from '@tenant/domain/value-objects/slug.vo';
import { BusinessTypeVO } from '@tenant/domain/value-objects/business-type.vo';
import { TenantStatusVO } from '@tenant/domain/value-objects/tenant-status.vo';
import { TenantNameVO } from '@tenant/domain/value-objects/tenant-name.vo';
import { CountryVO } from '@tenant/domain/value-objects/country.vo';
import { TimezoneVO } from '@shared/domain/value-objects/timezone.vo';
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
  private _name: TenantNameVO;
  private readonly _slug: SlugVO;
  private readonly _businessType: BusinessTypeVO;
  private readonly _country: CountryVO;
  private readonly _timezone: TimezoneVO;
  private _status: TenantStatusVO;
  private readonly _ownerUserId: number;

  private constructor(
    props: AggregateRootProps & {
      name: TenantNameVO;
      slug: SlugVO;
      businessType: BusinessTypeVO;
      country: CountryVO;
      timezone: TimezoneVO;
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
    const nameVO = TenantNameVO.create(props.name);
    const countryVO = CountryVO.create(props.country);
    const timezoneVO = TimezoneVO.create(props.timezone);

    const aggregate = new TenantAggregate({
      name: nameVO,
      slug: props.slug,
      businessType: props.businessType,
      country: countryVO,
      timezone: timezoneVO,
      status: TenantStatusVO.active(),
      ownerUserId: props.ownerUserId,
    });

    aggregate.apply(
      new TenantCreatedEvent(
        aggregate.uuid,
        String(props.ownerUserId),
        nameVO.getValue(),
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
      name: new TenantNameVO(props.name),
      slug: SlugVO.fromString(props.slug),
      businessType: BusinessTypeVO.fromString(props.businessType),
      country: new CountryVO(props.country),
      timezone: new TimezoneVO(props.timezone),
      status: TenantStatusVO.fromString(props.status),
      ownerUserId: props.ownerUserId,
    });
  }

  get name(): TenantNameVO {
    return this._name;
  }

  get slug(): string {
    return this._slug.toString();
  }

  get businessType(): string {
    return this._businessType.toString();
  }

  get country(): CountryVO {
    return this._country;
  }

  get timezone(): TimezoneVO {
    return this._timezone;
  }

  get status(): string {
    return this._status.toString();
  }

  get ownerUserId(): number {
    return this._ownerUserId;
  }

  updateName(name: string): void {
    this._name = TenantNameVO.create(name);
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
