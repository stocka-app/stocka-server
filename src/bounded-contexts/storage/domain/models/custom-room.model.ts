export interface CustomRoomModelProps {
  uuid: string;
  roomType: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomRoomModel {
  readonly uuid: string;
  readonly roomType: string;
  readonly address: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CustomRoomModelProps) {
    this.uuid = props.uuid;
    this.roomType = props.roomType;
    this.address = props.address;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: { uuid: string; roomType: string; address?: string }): CustomRoomModel {
    return new CustomRoomModel({
      uuid: props.uuid,
      roomType: props.roomType,
      address: props.address ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: CustomRoomModelProps): CustomRoomModel {
    return new CustomRoomModel(props);
  }
}
