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
  address?: string | null;
}

export interface CreateCustomRoomProps {
  uuid: string;
  tenantUUID: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  roomType: string;
  address?: string | null;
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
  address?: string | null;
}

export interface UpdateCustomRoomProps {
  name?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  address?: string | null;
  roomType?: string;
}
