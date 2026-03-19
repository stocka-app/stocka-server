import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';

describe('StorageNameVO', () => {
  describe('Given a valid storage name', () => {
    describe('When create is called', () => {
      it('Then the value is trimmed and stored', () => {
        const vo = StorageNameVO.create('  My Storage  ');
        expect(vo.toString()).toBe('My Storage');
      });
    });
  });

  describe('Given an empty storage name', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
        expect(() => StorageNameVO.create('')).toThrow('Storage name cannot be empty');
      });
    });
  });

  describe('Given a whitespace-only storage name', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
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

  describe('Given a storage name with exactly 100 characters', () => {
    describe('When create is called', () => {
      it('Then it succeeds', () => {
        const name = 'a'.repeat(100);
        const vo = StorageNameVO.create(name);
        expect(vo.toString()).toBe(name);
      });
    });
  });

  describe('Given two storage names with different casing', () => {
    describe('When equals is called', () => {
      it('Then they are equal (case-insensitive)', () => {
        const a = StorageNameVO.create('My Storage');
        const b = StorageNameVO.create('my storage');
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  describe('Given two different storage names', () => {
    describe('When equals is called', () => {
      it('Then they are not equal', () => {
        const a = StorageNameVO.create('Storage A');
        const b = StorageNameVO.create('Storage B');
        expect(a.equals(b)).toBe(false);
      });
    });
  });
});

describe('StorageAddressVO', () => {
  describe('Given a valid address', () => {
    describe('When create is called', () => {
      it('Then the value is trimmed and stored', () => {
        const vo = StorageAddressVO.create('  123 Main St  ');
        expect(vo.toString()).toBe('123 Main St');
      });
    });
  });

  describe('Given an empty address', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
        expect(() => StorageAddressVO.create('')).toThrow('Storage address cannot be empty');
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

  describe('Given an address with exactly 200 characters', () => {
    describe('When create is called', () => {
      it('Then it succeeds', () => {
        const addr = 'a'.repeat(200);
        const vo = StorageAddressVO.create(addr);
        expect(vo.toString()).toBe(addr);
      });
    });
  });

  describe('Given two identical addresses', () => {
    describe('When equals is called', () => {
      it('Then they are equal', () => {
        const a = StorageAddressVO.create('123 Main St');
        const b = StorageAddressVO.create('123 Main St');
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  describe('Given two different addresses', () => {
    describe('When equals is called', () => {
      it('Then they are not equal', () => {
        const a = StorageAddressVO.create('123 Main St');
        const b = StorageAddressVO.create('456 Oak Ave');
        expect(a.equals(b)).toBe(false);
      });
    });
  });
});

describe('RoomTypeNameVO', () => {
  describe('Given a valid room type name', () => {
    describe('When create is called', () => {
      it('Then the value is trimmed and stored', () => {
        const vo = RoomTypeNameVO.create('  Office  ');
        expect(vo.toString()).toBe('Office');
      });
    });
  });

  describe('Given an empty room type name', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
        expect(() => RoomTypeNameVO.create('')).toThrow('Room type name cannot be empty');
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

  describe('Given a room type name with exactly 50 characters', () => {
    describe('When create is called', () => {
      it('Then it succeeds', () => {
        const name = 'a'.repeat(50);
        const vo = RoomTypeNameVO.create(name);
        expect(vo.toString()).toBe(name);
      });
    });
  });

  describe('Given two identical room type names', () => {
    describe('When equals is called', () => {
      it('Then they are equal', () => {
        const a = RoomTypeNameVO.create('Office');
        const b = RoomTypeNameVO.create('Office');
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  describe('Given two different room type names', () => {
    describe('When equals is called', () => {
      it('Then they are not equal', () => {
        const a = RoomTypeNameVO.create('Office');
        const b = RoomTypeNameVO.create('Kitchen');
        expect(a.equals(b)).toBe(false);
      });
    });
  });
});
