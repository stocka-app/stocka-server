import { CreatedWithProviderVO } from '@user/account/domain/value-objects/created-with-provider.vo';
import { ProviderIdVO } from '@user/account/domain/value-objects/provider-id.vo';
import { FamilyNameVO } from '@user/profile/domain/value-objects/family-name.vo';
import { GivenNameVO } from '@user/profile/domain/value-objects/given-name.vo';
import { ProviderDisplayNameVO } from '@user/profile/domain/value-objects/provider-display-name.vo';

describe('CreatedWithProviderVO', () => {
  describe('Given each valid provider value', () => {
    it.each(['email', 'google', 'facebook', 'microsoft', 'apple'])(
      'Then create("%s") returns a VO that exposes the value',
      (provider) => {
        expect(CreatedWithProviderVO.create(provider).getValue()).toBe(provider);
      },
    );
  });

  describe('Given an empty string', () => {
    it('Then create() throws "CreatedWithProvider cannot be empty"', () => {
      expect(() => CreatedWithProviderVO.create('   ')).toThrow(
        'CreatedWithProvider cannot be empty',
      );
    });
  });

  describe('Given an unsupported provider value', () => {
    it('Then create() throws "Invalid CreatedWithProvider value:"', () => {
      expect(() => CreatedWithProviderVO.create('linkedin')).toThrow(
        /Invalid CreatedWithProvider value/,
      );
    });
  });

  describe('Given a provider value longer than 30 characters', () => {
    it('Then create() throws a length-bound error', () => {
      const tooLong = 'a'.repeat(31);
      expect(() => CreatedWithProviderVO.create(tooLong)).toThrow(
        'CreatedWithProvider cannot exceed 30 characters',
      );
    });
  });
});

describe('ProviderIdVO', () => {
  describe('Given a valid provider id', () => {
    it('Then create() returns a VO that exposes the trimmed value', () => {
      expect(ProviderIdVO.create('  google-uid-123  ').getValue()).toBe('google-uid-123');
    });
  });

  describe('Given an empty string', () => {
    it('Then create() throws "ProviderId cannot be empty"', () => {
      expect(() => ProviderIdVO.create('   ')).toThrow('ProviderId cannot be empty');
    });
  });

  describe('Given an id longer than 255 characters', () => {
    it('Then create() throws a length-bound error', () => {
      const tooLong = 'a'.repeat(256);
      expect(() => ProviderIdVO.create(tooLong)).toThrow('ProviderId cannot exceed 255 characters');
    });
  });

  describe('Given an id at the boundary', () => {
    it('Then create() returns a VO without throwing', () => {
      expect(() => ProviderIdVO.create('a'.repeat(255))).not.toThrow();
    });
  });
});

describe('FamilyNameVO', () => {
  describe('Given a valid family name', () => {
    it('Then create() returns a VO with the trimmed value', () => {
      expect(FamilyNameVO.create('  Medina  ').getValue()).toBe('Medina');
    });
  });

  describe('Given an empty string', () => {
    it('Then create() throws "FamilyName cannot be empty"', () => {
      expect(() => FamilyNameVO.create('   ')).toThrow('FamilyName cannot be empty');
    });
  });

  describe('Given a value over 100 characters', () => {
    it('Then create() throws a length-bound error', () => {
      expect(() => FamilyNameVO.create('a'.repeat(101))).toThrow(
        'FamilyName cannot exceed 100 characters',
      );
    });
  });
});

describe('GivenNameVO', () => {
  describe('Given a valid given name', () => {
    it('Then create() returns a VO with the trimmed value', () => {
      expect(GivenNameVO.create('  Roberto  ').getValue()).toBe('Roberto');
    });
  });

  describe('Given an empty string', () => {
    it('Then create() throws "GivenName cannot be empty"', () => {
      expect(() => GivenNameVO.create('   ')).toThrow('GivenName cannot be empty');
    });
  });

  describe('Given a value over 100 characters', () => {
    it('Then create() throws a length-bound error', () => {
      expect(() => GivenNameVO.create('a'.repeat(101))).toThrow(
        'GivenName cannot exceed 100 characters',
      );
    });
  });
});

describe('ProviderDisplayNameVO', () => {
  describe('Given a valid display name', () => {
    it('Then create() returns a VO with the trimmed value', () => {
      expect(ProviderDisplayNameVO.create('  Austin  ').getValue()).toBe('Austin');
    });
  });

  describe('Given an empty string', () => {
    it('Then create() throws "ProviderDisplayName cannot be empty"', () => {
      expect(() => ProviderDisplayNameVO.create('   ')).toThrow(
        'ProviderDisplayName cannot be empty',
      );
    });
  });

  describe('Given a value over 200 characters', () => {
    it('Then create() throws a length-bound error', () => {
      expect(() => ProviderDisplayNameVO.create('a'.repeat(201))).toThrow(
        'ProviderDisplayName cannot exceed 200 characters',
      );
    });
  });
});
