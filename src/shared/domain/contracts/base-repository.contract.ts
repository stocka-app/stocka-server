/**
 * Persisted<T> — narrows the return type of any repository method that fetches or saves a domain
 * object from/to the database. Any object that has gone through persistence always has id: number
 * (TypeORM populates @PrimaryGeneratedColumn on save; mappers always pass id to reconstitute).
 *
 * Use this as the return type of persist() and find*() methods in domain contracts so callers
 * never need to assert `.id!` — the type system expresses the postcondition directly.
 */
export type Persisted<T> = T & { id: number };

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
  findById(id: number): Promise<Persisted<T> | null>;
  findByUUID(uuid: string): Promise<Persisted<T> | null>;
  persist(model: T): Promise<Persisted<T>>;
}
