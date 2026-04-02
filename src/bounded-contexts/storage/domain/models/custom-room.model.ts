import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';

export interface CustomRoomModelProps {
  id?: number;
  uuid: UUIDVO;
  name: StorageNameVO;
  description: StorageDescriptionVO | null;
  icon: StorageIconVO;
  color: StorageColorVO;
  roomType: RoomTypeNameVO;
  address: StorageAddressVO;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomRoomModel {
  readonly id: number | undefined;
  readonly uuid: UUIDVO;
  readonly name: StorageNameVO;
  readonly description: StorageDescriptionVO | null;
  readonly icon: StorageIconVO;
  readonly color: StorageColorVO;
  readonly roomType: RoomTypeNameVO;
  readonly address: StorageAddressVO;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CustomRoomModelProps) {
    this.id = props.id;
    this.uuid = props.uuid;
    this.name = props.name;
    this.description = props.description;
    this.icon = props.icon;
    this.color = props.color;
    this.roomType = props.roomType;
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
    roomType: string;
    address: string;
  }): CustomRoomModel {
    return new CustomRoomModel({
      uuid: new UUIDVO(props.uuid),
      name: StorageNameVO.create(props.name),
      description: props.description ? StorageDescriptionVO.create(props.description) : null,
      icon: StorageIconVO.create(props.icon),
      color: StorageColorVO.create(props.color),
      roomType: RoomTypeNameVO.create(props.roomType),
      address: StorageAddressVO.create(props.address),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  update(props: {
    name?: string;
    description?: string | null;
    icon?: string;
    color?: string;
    roomType?: string;
    address?: string;
  }): CustomRoomModel {
    return new CustomRoomModel({
      id: this.id,
      uuid: this.uuid,
      name: props.name !== undefined ? StorageNameVO.create(props.name) : this.name,
      description:
        props.description !== undefined
          ? props.description !== null
            ? StorageDescriptionVO.create(props.description)
            : null
          : this.description,
      icon: props.icon !== undefined ? StorageIconVO.create(props.icon) : this.icon,
      color: props.color !== undefined ? StorageColorVO.create(props.color) : this.color,
      roomType: props.roomType !== undefined ? RoomTypeNameVO.create(props.roomType) : this.roomType,
      address: props.address !== undefined ? StorageAddressVO.create(props.address) : this.address,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: CustomRoomModelProps): CustomRoomModel {
    return new CustomRoomModel(props);
  }
}
