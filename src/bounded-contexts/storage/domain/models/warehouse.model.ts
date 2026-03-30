export interface WarehouseModelProps {
  id?: number;
  uuid: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export class WarehouseModel {
  readonly id: number | undefined;
  readonly uuid: string;
  readonly address: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: WarehouseModelProps) {
    this.id = props.id;
    this.uuid = props.uuid;
    this.address = props.address;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: { uuid: string; address: string }): WarehouseModel {
    return new WarehouseModel({
      uuid: props.uuid,
      address: props.address,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: WarehouseModelProps): WarehouseModel {
    return new WarehouseModel(props);
  }
}
