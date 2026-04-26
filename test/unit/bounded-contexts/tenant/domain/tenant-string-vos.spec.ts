import { AddressLineVO } from '@tenant/domain/value-objects/address-line.vo';
import { CityVO } from '@tenant/domain/value-objects/city.vo';
import { CountryVO } from '@tenant/domain/value-objects/country.vo';
import { GiroVO } from '@tenant/domain/value-objects/giro.vo';
import { InvitationTokenVO } from '@tenant/domain/value-objects/invitation-token.vo';
import { LogoUrlVO } from '@tenant/domain/value-objects/logo-url.vo';
import { PostalCodeVO } from '@tenant/domain/value-objects/postal-code.vo';
import { StateVO } from '@tenant/domain/value-objects/state.vo';
import { TenantNameVO } from '@tenant/domain/value-objects/tenant-name.vo';
import { TierPlanNameVO } from '@tenant/domain/value-objects/tier-plan-name.vo';
import { WebsiteVO } from '@tenant/domain/value-objects/website.vo';

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
    name: 'AddressLineVO',
    factory: AddressLineVO,
    validInput: '  500 Industrial Ave  ',
    expectedTrimmed: '500 Industrial Ave',
    emptyError: 'Address line cannot be empty',
    maxLength: 200,
    longError: 'Address line cannot exceed 200 characters',
  },
  {
    name: 'CityVO',
    factory: CityVO,
    validInput: '  CDMX  ',
    expectedTrimmed: 'CDMX',
    emptyError: 'City cannot be empty',
    maxLength: 100,
    longError: 'City cannot exceed 100 characters',
  },
  {
    name: 'CountryVO',
    factory: CountryVO,
    validInput: '  MX  ',
    expectedTrimmed: 'MX',
    emptyError: 'Country cannot be empty',
    maxLength: 5,
    longError: 'Country cannot exceed 5 characters',
  },
  {
    name: 'GiroVO',
    factory: GiroVO,
    validInput: '  Comercio  ',
    expectedTrimmed: 'Comercio',
    emptyError: 'Giro cannot be empty',
    maxLength: 100,
    longError: 'Giro cannot exceed 100 characters',
  },
  {
    name: 'InvitationTokenVO',
    factory: InvitationTokenVO,
    validInput: '  abc-token-123  ',
    expectedTrimmed: 'abc-token-123',
    emptyError: 'Invitation token cannot be empty',
    maxLength: 255,
    longError: 'Invitation token cannot exceed 255 characters',
  },
  {
    name: 'LogoUrlVO',
    factory: LogoUrlVO,
    validInput: '  https://example.com/logo.png  ',
    expectedTrimmed: 'https://example.com/logo.png',
    emptyError: 'Logo URL cannot be empty',
    maxLength: 500,
    longError: 'Logo URL cannot exceed 500 characters',
  },
  {
    name: 'PostalCodeVO',
    factory: PostalCodeVO,
    validInput: '  06000  ',
    expectedTrimmed: '06000',
    emptyError: 'Postal code cannot be empty',
    maxLength: 20,
    longError: 'Postal code cannot exceed 20 characters',
  },
  {
    name: 'StateVO',
    factory: StateVO,
    validInput: '  CDMX  ',
    expectedTrimmed: 'CDMX',
    emptyError: 'State cannot be empty',
    maxLength: 100,
    longError: 'State cannot exceed 100 characters',
  },
  {
    name: 'TenantNameVO',
    factory: TenantNameVO,
    validInput: '  Mi Negocio  ',
    expectedTrimmed: 'Mi Negocio',
    emptyError: 'Tenant name cannot be empty',
    maxLength: 100,
    longError: 'Tenant name cannot exceed 100 characters',
  },
  {
    name: 'TierPlanNameVO',
    factory: TierPlanNameVO,
    validInput: '  Starter  ',
    expectedTrimmed: 'Starter',
    emptyError: 'Tier plan name cannot be empty',
    maxLength: 50,
    longError: 'Tier plan name cannot exceed 50 characters',
  },
  {
    name: 'WebsiteVO',
    factory: WebsiteVO,
    validInput: '  https://example.com  ',
    expectedTrimmed: 'https://example.com',
    emptyError: 'Website cannot be empty',
    maxLength: 255,
    longError: 'Website cannot exceed 255 characters',
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
      it('Then create() returns a VO that exposes the trimmed value', () => {
        const vo = factory.create(validInput);
        expect(vo.getValue()).toBe(expectedTrimmed);
      });
    });

    describe('Given an empty (whitespace-only) input', () => {
      it(`Then create() throws "${emptyError}"`, () => {
        expect(() => factory.create('   ')).toThrow(emptyError);
      });
    });

    describe(`Given an input longer than ${maxLength} characters`, () => {
      it('Then create() throws a length-bound error', () => {
        const tooLong = 'a'.repeat(maxLength + 1);
        expect(() => factory.create(tooLong)).toThrow(longError);
      });
    });

    describe('Given an input exactly at the boundary', () => {
      it('Then create() returns a VO without throwing', () => {
        const exactly = 'a'.repeat(maxLength);
        expect(() => factory.create(exactly)).not.toThrow();
      });
    });
  });
}
