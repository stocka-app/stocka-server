export abstract class DomainException extends Error {
  readonly errorCode: string;
  readonly details: { field: string; message: string }[];
  readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    errorCode: string = 'DOMAIN_ERROR',
    details: { field: string; message: string }[] = [],
    metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.details = details;
    this.metadata = metadata;
  }
}
