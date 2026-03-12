export class EmailDeliveryException extends Error {
  constructor(
    message: string,
    public readonly recipient: string,
    public readonly providerError?: string,
  ) {
    super(message);
    this.name = 'EmailDeliveryException';
  }
}
