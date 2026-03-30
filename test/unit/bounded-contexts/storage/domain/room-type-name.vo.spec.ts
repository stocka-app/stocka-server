import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';

describe('RoomTypeNameVO', () => {
  describe('Given a valid room type name', () => {
    describe('When create is called with a normal string', () => {
      it('Then the value is trimmed and stored', () => {
        const vo = RoomTypeNameVO.create('  Office  ');

        expect(vo.toString()).toBe('Office');
      });
    });

    describe('When create is called with exactly 50 characters', () => {
      it('Then it succeeds at the boundary limit', () => {
        const name = 'a'.repeat(50);
        const vo = RoomTypeNameVO.create(name);

        expect(vo.toString()).toBe(name);
      });
    });

    describe('When create is called with a single character', () => {
      it('Then it succeeds with the minimum valid input', () => {
        const vo = RoomTypeNameVO.create('A');

        expect(vo.toString()).toBe('A');
      });
    });
  });

  describe('Given an empty room type name', () => {
    describe('When create is called with an empty string', () => {
      it('Then it throws an error', () => {
        expect(() => RoomTypeNameVO.create('')).toThrow(
          'Room type name cannot be empty',
        );
      });
    });

    describe('When create is called with whitespace only', () => {
      it('Then it throws an error because trimmed value is empty', () => {
        expect(() => RoomTypeNameVO.create('   ')).toThrow(
          'Room type name cannot be empty',
        );
      });
    });
  });

  describe('Given a room type name exceeding 50 characters', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
        const longName = 'a'.repeat(51);

        expect(() => RoomTypeNameVO.create(longName)).toThrow(
          'Room type name cannot exceed 50 characters',
        );
      });
    });
  });

  describe('Given two RoomTypeNameVO instances', () => {
    describe('When equals is called with identical values', () => {
      it('Then they are equal', () => {
        const a = RoomTypeNameVO.create('Office');
        const b = RoomTypeNameVO.create('Office');

        expect(a.equals(b)).toBe(true);
      });
    });

    describe('When equals is called with different values', () => {
      it('Then they are not equal', () => {
        const a = RoomTypeNameVO.create('Office');
        const b = RoomTypeNameVO.create('Kitchen');

        expect(a.equals(b)).toBe(false);
      });
    });

    describe('When equals is called with different casing', () => {
      it('Then they are not equal (case-sensitive comparison)', () => {
        const a = RoomTypeNameVO.create('Office');
        const b = RoomTypeNameVO.create('office');

        expect(a.equals(b)).toBe(false);
      });
    });
  });
});
