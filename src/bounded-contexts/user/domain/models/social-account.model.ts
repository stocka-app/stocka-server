export interface SocialAccountProps {
  id?: number;
  uuid?: string;
  userId: number;
  provider: string;
  providerId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SocialAccountModel {
  readonly id: number | undefined;
  readonly uuid: string | undefined;
  readonly userId: number;
  readonly provider: string;
  readonly providerId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SocialAccountProps) {
    this.id = props.id;
    this.uuid = props.uuid;
    this.userId = props.userId;
    this.provider = props.provider;
    this.providerId = props.providerId;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: SocialAccountProps): SocialAccountModel {
    return new SocialAccountModel(props);
  }
}
