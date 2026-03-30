export interface StoreRoomModelProps {
  id?: number;
  uuid: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class StoreRoomModel {
  readonly id: number | undefined;
  readonly uuid: string;
  readonly address: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: StoreRoomModelProps) {
    this.id = props.id;
    this.uuid = props.uuid;
    this.address = props.address;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: { uuid: string; address?: string }): StoreRoomModel {
    return new StoreRoomModel({
      uuid: props.uuid,
      address: props.address ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: StoreRoomModelProps): StoreRoomModel {
    return new StoreRoomModel(props);
  }
}
