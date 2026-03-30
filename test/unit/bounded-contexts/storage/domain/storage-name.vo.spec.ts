import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';

describe('StorageNameVO', () => {
  describe('Given a valid storage name', () => {
    describe('When create is called with a normal string', () => {
      it('Then the value is trimmed and stored', () => {
        const vo = StorageNameVO.create('  My Storage  ');

        expect(vo.toString()).toBe('My Storage');
      });
    });

    describe('When create is called with exactly 100 characters', () => {
      it('Then it succeeds at the boundary limit', () => {
        const name = 'a'.repeat(100);
        const vo = StorageNameVO.create(name);

        expect(vo.toString()).toBe(name);
      });
    });

    describe('When create is called with a single character', () => {
      it('Then it succeeds with the minimum valid input', () => {
        const vo = StorageNameVO.create('W');

        expect(vo.toString()).toBe('W');
      });
    });
  });

  describe('Given an empty storage name', () => {
    describe('When create is called with an empty string', () => {
      it('Then it throws an error', () => {
        expect(() => StorageNameVO.create('')).toThrow('Storage name cannot be empty');
      });
    });

    describe('When create is called with whitespace only', () => {
      it('Then it throws an error because trimmed value is empty', () => {
        expect(() => StorageNameVO.create('   ')).toThrow('Storage name cannot be empty');
      });
    });
  });

  describe('Given a storage name exceeding 100 characters', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
        const longName = 'a'.repeat(101);

        expect(() => StorageNameVO.create(longName)).toThrow(
          'Storage name cannot exceed 100 characters',
        );
      });
    });
  });

  describe('Given two StorageNameVO instances', () => {
    describe('When equals is called with identical values', () => {
      it('Then they are equal', () => {
        const a = StorageNameVO.create('Storage A');
        const b = StorageNameVO.create('Storage A');

        expect(a.equals(b)).toBe(true);
      });
    });

    describe('When equals is called with different casing', () => {
      it('Then they are equal (case-insensitive comparison)', () => {
        const a = StorageNameVO.create('My Storage');
        const b = StorageNameVO.create('my storage');

        expect(a.equals(b)).toBe(true);
      });
    });

    describe('When equals is called with different values', () => {
      it('Then they are not equal', () => {
        const a = StorageNameVO.create('Storage A');
        const b = StorageNameVO.create('Storage B');

        expect(a.equals(b)).toBe(false);
      });
    });
  });
});
