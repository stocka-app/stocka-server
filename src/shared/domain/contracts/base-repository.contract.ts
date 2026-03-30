/**
 * IBaseRepositoryContract — shared contract for aggregate/model persistence.
 *
 * Every domain repository contract should extend this interface.
 * T = domain model / aggregate type.
 *
 * Methods kept deliberately minimal:
 *   - findById   → lookup by numeric PK (internal)
 *   - findByUUID → lookup by external identifier
 *   - persist    → insert or update (upsert semantics)
 *
 * Specific contracts add domain-specific finders (findBySlug, findByEmail, etc.)
 * or write operations (archive, destroy) as needed.
 */
export interface IBaseRepositoryContract<T> {
  findById(id: number): Promise<T | null>;
  findByUUID(uuid: string): Promise<T | null>;
  persist(model: T): Promise<T>;
}
