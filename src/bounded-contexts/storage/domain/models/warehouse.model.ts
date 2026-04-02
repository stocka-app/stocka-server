import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';

export interface WarehouseModelProps {
  id: number;
  uuid: UUIDVO;
  name: StorageNameVO;
  description: StorageDescriptionVO | null;
  icon: StorageIconVO;
  color: StorageColorVO;
  address: StorageAddressVO;
  createdAt: Date;
  updatedAt: Date;
}

export class WarehouseModel {
  readonly id: number;
  readonly uuid: UUIDVO;
  readonly name: StorageNameVO;
  readonly description: StorageDescriptionVO | null;
  readonly icon: StorageIconVO;
  readonly color: StorageColorVO;
  readonly address: StorageAddressVO;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: WarehouseModelProps) {
    this.id = props.id;
    this.uuid = props.uuid;
    this.name = props.name;
    this.description = props.description;
    this.icon = props.icon;
    this.color = props.color;
    this.address = props.address;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: {
    uuid: string;
    name: string;
    description?: string;
    icon: string;
    color: string;
    address: string;
  }): WarehouseModel {
    return new WarehouseModel({
      id: 0,
      uuid: new UUIDVO(props.uuid),
      name: new StorageNameVO(props.name),
      description: props.description ? new StorageDescriptionVO(props.description) : null,
      icon: new StorageIconVO(props.icon),
      color: new StorageColorVO(props.color),
      address: new StorageAddressVO(props.address),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  update(props: {
    name?: string;
    description?: string | null;
    icon?: string;
    color?: string;
    address?: string;
  }): WarehouseModel {
    return new WarehouseModel({
      id: this.id,
      uuid: this.uuid,
      name: props.name !== undefined ? new StorageNameVO(props.name) : this.name,
      description:
        props.description !== undefined
          ? props.description !== null
            ? new StorageDescriptionVO(props.description)
            : null
          : this.description,
      icon: props.icon !== undefined ? new StorageIconVO(props.icon) : this.icon,
      color: props.color !== undefined ? new StorageColorVO(props.color) : this.color,
      address: props.address !== undefined ? new StorageAddressVO(props.address) : this.address,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: WarehouseModelProps): WarehouseModel {
    return new WarehouseModel(props);
  }
}
