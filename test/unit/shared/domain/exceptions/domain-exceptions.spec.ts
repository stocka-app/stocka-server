import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';
import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';

// ─── Concrete subclasses for testing abstract classes ─────────────────────────

class TestDomainException extends DomainException {}

class TestBusinessLogicException extends BusinessLogicException {}

class TestResourceNotFoundException extends ResourceNotFoundException {}

// ─── DomainException ─────────────────────────────────────────────────────────
describe('DomainException', () => {
  describe('Given only a message (using all defaults)', () => {
    it('Then errorCode defaults to DOMAIN_ERROR and details defaults to []', () => {
      const error = new TestDomainException('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error.errorCode).toBe('DOMAIN_ERROR');
      expect(error.details).toEqual([]);
      expect(error.metadata).toBeUndefined();
    });
  });

  describe('Given message and explicit errorCode', () => {
    it('Then it uses the provided errorCode and empty details', () => {
      const error = new TestDomainException('Custom error', 'CUSTOM_CODE');

      expect(error.errorCode).toBe('CUSTOM_CODE');
      expect(error.details).toEqual([]);
    });
  });

  describe('Given all arguments', () => {
    it('Then it stores all provided values', () => {
      const details = [{ field: 'email', message: 'invalid' }];
      const metadata = { attempt: 1 };
      const error = new TestDomainException('Full error', 'FULL_CODE', details, metadata);

      expect(error.errorCode).toBe('FULL_CODE');
      expect(error.details).toEqual(details);
      expect(error.metadata).toEqual(metadata);
    });
  });

  describe('Given a DomainException instance', () => {
    it('Then name equals the constructor name', () => {
      const error = new TestDomainException('msg');
      expect(error.name).toBe('TestDomainException');
    });
  });
});

// ─── BusinessLogicException ───────────────────────────────────────────────────
describe('BusinessLogicException', () => {
  describe('Given only a message (using all defaults)', () => {
    it('Then errorCode defaults to BUSINESS_LOGIC_ERROR', () => {
      const error = new TestBusinessLogicException('Business rule violated');

      expect(error.message).toBe('Business rule violated');
      expect(error.errorCode).toBe('BUSINESS_LOGIC_ERROR');
      expect(error.details).toEqual([]);
    });
  });

  describe('Given message and explicit errorCode', () => {
    it('Then it uses the provided errorCode', () => {
      const error = new TestBusinessLogicException('Error', 'MY_BIZ_ERROR');

      expect(error.errorCode).toBe('MY_BIZ_ERROR');
    });
  });
});

// ─── ResourceNotFoundException ────────────────────────────────────────────────
describe('ResourceNotFoundException', () => {
  describe('Given resource and identifier (using errorCode default)', () => {
    it('Then errorCode defaults to RESOURCE_NOT_FOUND', () => {
      const error = new TestResourceNotFoundException('User', '42');

      expect(error.message).toBe('User not found with identifier: 42');
      expect(error.errorCode).toBe('RESOURCE_NOT_FOUND');
      expect(error.details).toEqual([]);
    });
  });

  describe('Given resource, identifier, and explicit errorCode', () => {
    it('Then it uses the provided errorCode', () => {
      const error = new TestResourceNotFoundException('Product', 'sku-123', 'PRODUCT_NOT_FOUND');

      expect(error.errorCode).toBe('PRODUCT_NOT_FOUND');
      expect(error.message).toBe('Product not found with identifier: sku-123');
    });
  });
});
