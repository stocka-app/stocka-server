import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { EmailVO } from '@shared/domain/value-objects/compound/email.vo';
import { PhoneVO } from '@shared/domain/value-objects/phone.vo';
import { GiroVO } from '@tenant/domain/value-objects/giro.vo';
import { WebsiteVO } from '@tenant/domain/value-objects/website.vo';
import { AddressLineVO } from '@tenant/domain/value-objects/address-line.vo';
import { CityVO } from '@tenant/domain/value-objects/city.vo';
import { StateVO } from '@tenant/domain/value-objects/state.vo';
import { PostalCodeVO } from '@tenant/domain/value-objects/postal-code.vo';
import { LogoUrlVO } from '@tenant/domain/value-objects/logo-url.vo';

export interface TenantProfileReconstituteProps extends BaseModelProps {
  id: number;
  uuid: string;
  tenantId: number;
  giro: string | null;
  phone: string | null;
  contactEmail: string | null;
  website: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class TenantProfileModel extends BaseModel {
  protected _id: number | undefined;
  protected _uuid: UUIDVO;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _archivedAt: Date | null;

  private readonly _tenantId: number;
  private _giro: GiroVO | null;
  private _phone: PhoneVO | null;
  private _contactEmail: EmailVO | null;
  private _website: WebsiteVO | null;
  private _addressLine1: AddressLineVO | null;
  private _city: CityVO | null;
  private _state: StateVO | null;
  private _postalCode: PostalCodeVO | null;
  private _logoUrl: LogoUrlVO | null;

  private constructor(
    props: BaseModelProps & {
      tenantId: number;
      giro: string | null;
      phone: string | null;
      contactEmail: string | null;
      website: string | null;
      addressLine1: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      logoUrl: string | null;
    },
  ) {
    super();
    this._id = props.id;
    this._uuid = new UUIDVO(props.uuid);
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._archivedAt = props.archivedAt ?? null;
    this._tenantId = props.tenantId;
    this._giro = props.giro !== null ? GiroVO.create(props.giro) : null;
    this._phone = props.phone !== null ? PhoneVO.create(props.phone) : null;
    this._contactEmail = props.contactEmail !== null ? new EmailVO(props.contactEmail) : null;
    this._website = props.website !== null ? WebsiteVO.create(props.website) : null;
    this._addressLine1 =
      props.addressLine1 !== null ? AddressLineVO.create(props.addressLine1) : null;
    this._city = props.city !== null ? CityVO.create(props.city) : null;
    this._state = props.state !== null ? StateVO.create(props.state) : null;
    this._postalCode = props.postalCode !== null ? PostalCodeVO.create(props.postalCode) : null;
    this._logoUrl = props.logoUrl !== null ? LogoUrlVO.create(props.logoUrl) : null;
  }

  static createEmpty(tenantId: number): TenantProfileModel {
    return new TenantProfileModel({
      tenantId,
      giro: null,
      phone: null,
      contactEmail: null,
      website: null,
      addressLine1: null,
      city: null,
      state: null,
      postalCode: null,
      logoUrl: null,
    });
  }

  static reconstitute(props: TenantProfileReconstituteProps): TenantProfileModel {
    return new TenantProfileModel({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
      tenantId: props.tenantId,
      giro: props.giro,
      phone: props.phone,
      contactEmail: props.contactEmail,
      website: props.website,
      addressLine1: props.addressLine1,
      city: props.city,
      state: props.state,
      postalCode: props.postalCode,
      logoUrl: props.logoUrl,
    });
  }

  get id(): number | undefined {
    return this._id;
  }

  get uuid(): UUIDVO {
    return this._uuid;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get archivedAt(): Date | null {
    return this._archivedAt;
  }

  get tenantId(): number {
    return this._tenantId;
  }

  get giro(): GiroVO | null {
    return this._giro;
  }

  get phone(): PhoneVO | null {
    return this._phone;
  }

  get contactEmail(): EmailVO | null {
    return this._contactEmail;
  }

  get website(): WebsiteVO | null {
    return this._website;
  }

  get addressLine1(): AddressLineVO | null {
    return this._addressLine1;
  }

  get city(): CityVO | null {
    return this._city;
  }

  get state(): StateVO | null {
    return this._state;
  }

  get postalCode(): PostalCodeVO | null {
    return this._postalCode;
  }

  get logoUrl(): LogoUrlVO | null {
    return this._logoUrl;
  }
}
