import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { FullNameVO } from '@shared/domain/value-objects/full-name.vo';
import { CountryCodeVO } from '@shared/domain/value-objects/country-code.vo';
import { TaxIdVO } from '@shared/domain/value-objects/tax-id.vo';

export interface CommercialProfileReconstitueProps extends BaseModelProps {
  id: number;
  uuid: string;
  profileId: number;
  fullName: string | null;
  phone: string | null;
  countryCode: string | null;
  taxId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class CommercialProfileModel extends BaseModel {
  protected _id: number | undefined;
  protected _uuid: UUIDVO;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _archivedAt: Date | null;

  private readonly _profileId: number;
  private _fullName: FullNameVO | null;
  private _phone: string | null;
  private _countryCode: CountryCodeVO | null;
  private _taxId: TaxIdVO | null;

  private constructor(props: CommercialProfileReconstitueProps) {
    super();
    this._id = props.id;
    this._uuid = new UUIDVO(props.uuid);
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._archivedAt = props.archivedAt ?? null;
    this._profileId = props.profileId;
    this._fullName = props.fullName !== null ? FullNameVO.create(props.fullName) : null;
    this._phone = props.phone;
    this._countryCode = props.countryCode !== null ? CountryCodeVO.create(props.countryCode) : null;
    this._taxId = props.taxId !== null ? TaxIdVO.create(props.taxId) : null;
  }

  static createEmpty(props: { profileId: number }): CommercialProfileModel {
    return new CommercialProfileModel({
      id: undefined as unknown as number,
      uuid: undefined as unknown as string,
      profileId: props.profileId,
      fullName: null,
      phone: null,
      countryCode: null,
      taxId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
  }

  static reconstitute(props: CommercialProfileReconstitueProps): CommercialProfileModel {
    return new CommercialProfileModel(props);
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

  get profileId(): number {
    return this._profileId;
  }

  get fullName(): FullNameVO | null {
    return this._fullName;
  }

  get phone(): string | null {
    return this._phone;
  }

  get countryCode(): CountryCodeVO | null {
    return this._countryCode;
  }

  get taxId(): TaxIdVO | null {
    return this._taxId;
  }

  isComplete(): boolean {
    return this._fullName !== null && this._phone !== null;
  }
}
