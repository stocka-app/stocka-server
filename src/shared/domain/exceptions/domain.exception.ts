export abstract class DomainException extends Error {
  readonly errorCode: string;
  readonly details: { field: string; message: string }[];

  constructor(
    message: string,
    errorCode: string = 'DOMAIN_ERROR',
    details: { field: string; message: string }[] = [],
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.details = details;
  }
}
