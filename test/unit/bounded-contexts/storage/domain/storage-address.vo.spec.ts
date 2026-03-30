import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';

describe('StorageAddressVO', () => {
  describe('Given a valid address', () => {
    describe('When create is called with a normal string', () => {
      it('Then the value is trimmed and stored', () => {
        const vo = StorageAddressVO.create('  123 Main St  ');

        expect(vo.toString()).toBe('123 Main St');
      });
    });

    describe('When create is called with exactly 200 characters', () => {
      it('Then it succeeds at the boundary limit', () => {
        const addr = 'a'.repeat(200);
        const vo = StorageAddressVO.create(addr);

        expect(vo.toString()).toBe(addr);
      });
    });

    describe('When create is called with a single character', () => {
      it('Then it succeeds with the minimum valid input', () => {
        const vo = StorageAddressVO.create('X');

        expect(vo.toString()).toBe('X');
      });
    });
  });

  describe('Given an empty address', () => {
    describe('When create is called with an empty string', () => {
      it('Then it throws an error', () => {
        expect(() => StorageAddressVO.create('')).toThrow(
          'Storage address cannot be empty',
        );
      });
    });

    describe('When create is called with whitespace only', () => {
      it('Then it throws an error because trimmed value is empty', () => {
        expect(() => StorageAddressVO.create('   ')).toThrow(
          'Storage address cannot be empty',
        );
      });
    });
  });

  describe('Given an address exceeding 200 characters', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
        const longAddr = 'a'.repeat(201);

        expect(() => StorageAddressVO.create(longAddr)).toThrow(
          'Storage address cannot exceed 200 characters',
        );
      });
    });
  });

  describe('Given two StorageAddressVO instances', () => {
    describe('When equals is called with identical values', () => {
      it('Then they are equal', () => {
        const a = StorageAddressVO.create('123 Main St');
        const b = StorageAddressVO.create('123 Main St');

        expect(a.equals(b)).toBe(true);
      });
    });

    describe('When equals is called with different values', () => {
      it('Then they are not equal', () => {
        const a = StorageAddressVO.create('123 Main St');
        const b = StorageAddressVO.create('456 Oak Ave');

        expect(a.equals(b)).toBe(false);
      });
    });
  });
});
