import {
  resolveStorageIcon,
  resolveStorageColor,
  WAREHOUSE_DEFAULT_ICON,
  WAREHOUSE_DEFAULT_COLOR,
  STORE_ROOM_DEFAULT_ICON,
  STORE_ROOM_DEFAULT_COLOR,
  CUSTOM_ROOM_DEFAULT_ICON,
  CUSTOM_ROOM_DEFAULT_COLOR,
} from '@storage/domain/services/storage-icon-color.resolver';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

describe('StorageIconColorResolver', () => {
  describe('Given StorageType.WAREHOUSE', () => {
    describe('When resolveStorageIcon is called without an icon', () => {
      it('Then it returns the fixed warehouse icon', () => {
        expect(resolveStorageIcon(StorageType.WAREHOUSE)).toBe(WAREHOUSE_DEFAULT_ICON);
      });
    });

    describe('When resolveStorageIcon is called with a custom icon', () => {
      it('Then it ignores the input and returns the fixed warehouse icon', () => {
        expect(resolveStorageIcon(StorageType.WAREHOUSE, 'custom-icon')).toBe(
          WAREHOUSE_DEFAULT_ICON,
        );
      });
    });

    describe('When resolveStorageColor is called without a color', () => {
      it('Then it returns the fixed warehouse color', () => {
        expect(resolveStorageColor(StorageType.WAREHOUSE)).toBe(WAREHOUSE_DEFAULT_COLOR);
      });
    });

    describe('When resolveStorageColor is called with a custom color', () => {
      it('Then it ignores the input and returns the fixed warehouse color', () => {
        expect(resolveStorageColor(StorageType.WAREHOUSE, '#FF0000')).toBe(WAREHOUSE_DEFAULT_COLOR);
      });
    });
  });

  describe('Given StorageType.STORE_ROOM', () => {
    describe('When resolveStorageIcon is called without an icon', () => {
      it('Then it returns the fixed store room icon', () => {
        expect(resolveStorageIcon(StorageType.STORE_ROOM)).toBe(STORE_ROOM_DEFAULT_ICON);
      });
    });

    describe('When resolveStorageIcon is called with a custom icon', () => {
      it('Then it ignores the input and returns the fixed store room icon', () => {
        expect(resolveStorageIcon(StorageType.STORE_ROOM, 'any-icon')).toBe(
          STORE_ROOM_DEFAULT_ICON,
        );
      });
    });

    describe('When resolveStorageColor is called without a color', () => {
      it('Then it returns the fixed store room color', () => {
        expect(resolveStorageColor(StorageType.STORE_ROOM)).toBe(STORE_ROOM_DEFAULT_COLOR);
      });
    });

    describe('When resolveStorageColor is called with a custom color', () => {
      it('Then it ignores the input and returns the fixed store room color', () => {
        expect(resolveStorageColor(StorageType.STORE_ROOM, '#00FF00')).toBe(
          STORE_ROOM_DEFAULT_COLOR,
        );
      });
    });
  });

  describe('Given StorageType.CUSTOM_ROOM', () => {
    describe('When resolveStorageIcon is called without an icon', () => {
      it('Then it returns the custom room default icon', () => {
        expect(resolveStorageIcon(StorageType.CUSTOM_ROOM)).toBe(CUSTOM_ROOM_DEFAULT_ICON);
      });
    });

    describe('When resolveStorageIcon is called with an icon', () => {
      it('Then it returns that icon', () => {
        expect(resolveStorageIcon(StorageType.CUSTOM_ROOM, 'meeting_room')).toBe('meeting_room');
      });
    });

    describe('When resolveStorageColor is called without a color', () => {
      it('Then it returns the custom room default color', () => {
        expect(resolveStorageColor(StorageType.CUSTOM_ROOM)).toBe(CUSTOM_ROOM_DEFAULT_COLOR);
      });
    });

    describe('When resolveStorageColor is called with a color', () => {
      it('Then it returns that color', () => {
        expect(resolveStorageColor(StorageType.CUSTOM_ROOM, '#A855F7')).toBe('#A855F7');
      });
    });
  });
});
