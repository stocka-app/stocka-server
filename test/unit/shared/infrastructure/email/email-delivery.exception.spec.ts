import { EmailDeliveryException } from '@shared/infrastructure/email/exceptions/email-delivery.exception';

describe('EmailDeliveryException', () => {
  describe('Given a message, recipient, and providerError', () => {
    it('Then it stores all provided values and sets the name correctly', () => {
      const error = new EmailDeliveryException(
        'Failed to deliver email',
        'user@example.com',
        'SMTP timeout',
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Failed to deliver email');
      expect(error.recipient).toBe('user@example.com');
      expect(error.providerError).toBe('SMTP timeout');
      expect(error.name).toBe('EmailDeliveryException');
    });
  });

  describe('Given a message and recipient without providerError', () => {
    it('Then providerError is undefined', () => {
      const error = new EmailDeliveryException('Delivery failed', 'other@example.com');

      expect(error.recipient).toBe('other@example.com');
      expect(error.providerError).toBeUndefined();
    });
  });

  describe('Given an EmailDeliveryException instance', () => {
    it('Then it is an instance of Error', () => {
      const error = new EmailDeliveryException('msg', 'r@r.com');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
