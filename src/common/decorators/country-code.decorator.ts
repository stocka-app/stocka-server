import { countryCodes } from '@common/constants/country-master-data.constants';
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

// Custom validator to check if a string is a valid ISO 3166-1 alpha-2 country code
export function IsCountryCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isCountryCode',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          return countryCodes.includes(value.toUpperCase());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid ISO 3166-1 alpha-2 country code`;
        },
      },
    });
  };
}
