import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';

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

// ── StorageColorVO ──────────────────────────────────────────────────────────────

describe('StorageColorVO', () => {
  describe('Given a valid hex color', () => {
    describe('When create is called', () => {
      it('Then the value is trimmed and stored', () => {
        const vo = StorageColorVO.create('  #1A2B3C  ');
        expect(vo.toString()).toBe('#1A2B3C');
      });
    });
  });

  describe('Given an invalid hex color', () => {
    describe('When create is called', () => {
      it('Then it throws an error for a non-hex string', () => {
        expect(() => StorageColorVO.create('red')).toThrow(
          'Storage color must be a valid hex color (e.g. #1A2B3C)',
        );
      });

      it('Then it throws an error for a short hex', () => {
        expect(() => StorageColorVO.create('#ABC')).toThrow(
          'Storage color must be a valid hex color (e.g. #1A2B3C)',
        );
      });
    });
  });
});

// ── StorageDescriptionVO ────────────────────────────────────────────────────────

describe('StorageDescriptionVO', () => {
  describe('Given a valid description', () => {
    describe('When create is called', () => {
      it('Then the value is trimmed and stored', () => {
        const vo = StorageDescriptionVO.create('  Main office space  ');
        expect(vo.toString()).toBe('Main office space');
      });
    });
  });

  describe('Given a description shorter than 5 characters', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
        expect(() => StorageDescriptionVO.create('Hi')).toThrow(
          'Storage description must be at least 5 characters',
        );
      });
    });
  });

  describe('Given a description exceeding 300 characters', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
        expect(() => StorageDescriptionVO.create('a'.repeat(301))).toThrow(
          'Storage description cannot exceed 300 characters',
        );
      });
    });
  });
});

// ── StorageIconVO ───────────────────────────────────────────────────────────────

describe('StorageIconVO', () => {
  describe('Given a valid icon identifier', () => {
    describe('When create is called', () => {
      it('Then the value is trimmed and stored', () => {
        const vo = StorageIconVO.create('  office-icon  ');
        expect(vo.toString()).toBe('office-icon');
      });
    });
  });

  describe('Given an empty icon identifier', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
        expect(() => StorageIconVO.create('')).toThrow('Storage icon identifier cannot be empty');
      });
    });
  });

  describe('Given an icon identifier exceeding 100 characters', () => {
    describe('When create is called', () => {
      it('Then it throws an error', () => {
        expect(() => StorageIconVO.create('a'.repeat(101))).toThrow(
          'Storage icon identifier cannot exceed 100 characters',
        );
      });
    });
  });
});
