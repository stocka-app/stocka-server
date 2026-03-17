import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';

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
  private readonly _tenantId: number;
  private _giro: string | null;
  private _phone: string | null;
  private _contactEmail: string | null;
  private _website: string | null;
  private _addressLine1: string | null;
  private _city: string | null;
  private _state: string | null;
  private _postalCode: string | null;
  private _logoUrl: string | null;

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
    super(props);
    this._tenantId = props.tenantId;
    this._giro = props.giro;
    this._phone = props.phone;
    this._contactEmail = props.contactEmail;
    this._website = props.website;
    this._addressLine1 = props.addressLine1;
    this._city = props.city;
    this._state = props.state;
    this._postalCode = props.postalCode;
    this._logoUrl = props.logoUrl;
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

  get tenantId(): number {
    return this._tenantId;
  }

  get giro(): string | null {
    return this._giro;
  }

  get phone(): string | null {
    return this._phone;
  }

  get contactEmail(): string | null {
    return this._contactEmail;
  }

  get website(): string | null {
    return this._website;
  }

  get addressLine1(): string | null {
    return this._addressLine1;
  }

  get city(): string | null {
    return this._city;
  }

  get state(): string | null {
    return this._state;
  }

  get postalCode(): string | null {
    return this._postalCode;
  }

  get logoUrl(): string | null {
    return this._logoUrl;
  }
}
