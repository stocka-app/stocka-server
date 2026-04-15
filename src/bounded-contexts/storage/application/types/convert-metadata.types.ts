/**
 * Metadata merged into the target model during a convert-to-* transition.
 * When a field is omitted (undefined), the handler inherits the value from
 * the source storage (or falls back to the target type's default where the
 * source does not have an equivalent — e.g. Warehouse → CustomRoom icon).
 *
 * For `description`, `null` means "clear the description" while `undefined`
 * means "inherit from source".
 */

export interface ConvertToWarehouseMetadata {
  name?: string;
  description?: string | null;
  /** null explicitly clears; undefined inherits source; string sets. Address is
   *  required for WAREHOUSE — the handler will return an error if effective
   *  address ends up empty. */
  address?: string | null;
}

export interface ConvertToStoreRoomMetadata {
  name?: string;
  description?: string | null;
  address?: string | null;
}

export interface ConvertToCustomRoomMetadata {
  name?: string;
  description?: string | null;
  address?: string | null;
  roomType?: string;
  icon?: string;
  color?: string;
}
