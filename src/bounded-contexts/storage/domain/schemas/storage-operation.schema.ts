// Create props
export interface CreateWarehouseProps {
  uuid: string;
  tenantUUID: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  address: string;
}

export interface CreateStoreRoomProps {
  uuid: string;
  tenantUUID: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  address: string;
}

export interface CreateCustomRoomProps {
  uuid: string;
  tenantUUID: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  roomType: string;
  address: string;
}

// Update props
export interface UpdateWarehouseProps {
  name?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  address?: string;
}

export interface UpdateStoreRoomProps {
  name?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  address?: string;
}

export interface UpdateCustomRoomProps {
  name?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  address?: string;
  roomType?: string;
}
