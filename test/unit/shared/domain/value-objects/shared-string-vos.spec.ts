import { AvatarUrlVO } from '@shared/domain/value-objects/avatar-url.vo';
import { CountryCodeVO } from '@shared/domain/value-objects/country-code.vo';
import { DisplayNameVO } from '@shared/domain/value-objects/display-name.vo';
import { FullNameVO } from '@shared/domain/value-objects/full-name.vo';
import { LocaleVO } from '@shared/domain/value-objects/locale.vo';
import { PhoneVO } from '@shared/domain/value-objects/phone.vo';
import { TaxIdVO } from '@shared/domain/value-objects/tax-id.vo';
import { TimezoneVO } from '@shared/domain/value-objects/timezone.vo';

interface StringVOLike {
  getValue(): string;
}

interface StringVOFactory {
  create(value: string): StringVOLike;
}

const cases: Array<{
  name: string;
  factory: StringVOFactory;
  validInput: string;
  expectedTrimmed: string;
  emptyError: string;
  maxLength: number;
  longError: string;
}> = [
  {
    name: 'AvatarUrlVO',
    factory: AvatarUrlVO,
    validInput: '  https://cdn.example.com/avatars/me.png  ',
    expectedTrimmed: 'https://cdn.example.com/avatars/me.png',
    emptyError: 'AvatarUrl cannot be empty',
    maxLength: 500,
    longError: 'AvatarUrl cannot exceed 500 characters',
  },
  {
    name: 'CountryCodeVO',
    factory: CountryCodeVO,
    validInput: '  mx  ',
    expectedTrimmed: 'MX',
    emptyError: 'CountryCode cannot be empty',
    maxLength: 5,
    longError: 'CountryCode cannot exceed 5 characters',
  },
  {
    name: 'DisplayNameVO',
    factory: DisplayNameVO,
    validInput: '  Austin  ',
    expectedTrimmed: 'Austin',
    emptyError: 'DisplayName cannot be empty',
    maxLength: 100,
    longError: 'DisplayName cannot exceed 100 characters',
  },
  {
    name: 'FullNameVO',
    factory: FullNameVO,
    validInput: '  Roberto Austin Medina  ',
    expectedTrimmed: 'Roberto Austin Medina',
    emptyError: 'FullName cannot be empty',
    maxLength: 100,
    longError: 'FullName cannot exceed 100 characters',
  },
  {
    name: 'LocaleVO',
    factory: LocaleVO,
    validInput: '  es-MX  ',
    expectedTrimmed: 'es-MX',
    emptyError: 'Locale cannot be empty',
    maxLength: 10,
    longError: 'Locale cannot exceed 10 characters',
  },
  {
    name: 'PhoneVO',
    factory: PhoneVO,
    validInput: '  +52 55 1234 5678  ',
    expectedTrimmed: '+52 55 1234 5678',
    emptyError: 'Phone cannot be empty',
    maxLength: 30,
    longError: 'Phone cannot exceed 30 characters',
  },
  {
    name: 'TaxIdVO',
    factory: TaxIdVO,
    validInput: '  rfc1234567890  ',
    expectedTrimmed: 'RFC1234567890',
    emptyError: 'TaxId cannot be empty',
    maxLength: 50,
    longError: 'TaxId cannot exceed 50 characters',
  },
  {
    name: 'TimezoneVO',
    factory: TimezoneVO,
    validInput: '  America/Mexico_City  ',
    expectedTrimmed: 'America/Mexico_City',
    emptyError: 'Timezone cannot be empty',
    maxLength: 50,
    longError: 'Timezone cannot exceed 50 characters',
  },
];

for (const {
  name,
  factory,
  validInput,
  expectedTrimmed,
  emptyError,
  maxLength,
  longError,
} of cases) {
  describe(name, () => {
    describe('Given a valid input with surrounding whitespace', () => {
      describe('When create() is called', () => {
        it('Then it returns a VO that exposes the trimmed value', () => {
          const vo = factory.create(validInput);
          expect(vo.getValue()).toBe(expectedTrimmed);
        });
      });
    });

    describe('Given an empty (whitespace-only) input', () => {
      describe('When create() is called', () => {
        it(`Then it throws "${emptyError}"`, () => {
          expect(() => factory.create('   ')).toThrow(emptyError);
        });
      });
    });

    describe(`Given an input longer than ${maxLength} characters`, () => {
      describe('When create() is called', () => {
        it('Then it throws a length-bound error', () => {
          const tooLong = 'a'.repeat(maxLength + 1);
          expect(() => factory.create(tooLong)).toThrow(longError);
        });
      });
    });

    describe('Given an input exactly at the boundary', () => {
      describe('When create() is called', () => {
        it('Then it returns a VO without throwing', () => {
          const exactly = 'a'.repeat(maxLength);
          expect(() => factory.create(exactly)).not.toThrow();
        });
      });
    });
  });
}
