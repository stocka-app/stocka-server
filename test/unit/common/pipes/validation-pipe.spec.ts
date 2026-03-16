import { IsEmail, IsString, MinLength } from 'class-validator';
import { BadRequestException, ArgumentMetadata, ValidationError } from '@nestjs/common';
import { globalValidationPipe } from '@common/pipes/validation.pipe';

class TestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  username!: string;
}

const metadata: ArgumentMetadata = { type: 'body', metatype: TestDto };

describe('globalValidationPipe', () => {
  describe('Given the pipe is imported', () => {
    it('Then it exports a ValidationPipe instance', () => {
      expect(globalValidationPipe).toBeDefined();
    });
  });

  describe('Given invalid input with validation errors', () => {
    describe('When the pipe transforms bad data', () => {
      it('Then it throws BadRequestException with structured details', async () => {
        await expect(
          globalValidationPipe.transform({ email: 'not-an-email', username: 'ab' }, metadata),
        ).rejects.toThrow(BadRequestException);
      });

      it('Then the error contains VALIDATION_ERROR code and details array', async () => {
        let caughtError: BadRequestException | undefined;
        try {
          await globalValidationPipe.transform({ email: 'not-an-email', username: 'ab' }, metadata);
        } catch (err) {
          caughtError = err as BadRequestException;
        }
        expect(caughtError).toBeInstanceOf(BadRequestException);
        const response = caughtError!.getResponse() as Record<string, unknown>;
        expect(response.error).toBe('VALIDATION_ERROR');
        expect(Array.isArray(response.details)).toBe(true);
      });
    });
  });

  describe('Given input missing required fields (empty object)', () => {
    describe('When the pipe transforms and no constraints produce errors', () => {
      it('Then it throws with a message from the first detail or Validation failed default', async () => {
        await expect(globalValidationPipe.transform({}, metadata)).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  describe('Given the exceptionFactory is called directly', () => {
    // Access the protected factory to test edge-case branches
    const factory = (
      globalValidationPipe as unknown as {
        exceptionFactory: (e: ValidationError[]) => BadRequestException;
      }
    ).exceptionFactory;

    describe('When a ValidationError has no constraints (nested children only)', () => {
      it('Then constraints falls back to {} and details is empty, so message defaults to "Validation failed"', () => {
        const errors: ValidationError[] = [
          { property: 'address', constraints: undefined, children: [] },
        ];
        const exception = factory(errors);
        expect(exception).toBeInstanceOf(BadRequestException);
        const response = exception.getResponse() as Record<string, unknown>;
        expect(response.message).toBe('Validation failed');
        expect(response.error).toBe('VALIDATION_ERROR');
        expect((response.details as unknown[]).length).toBe(0);
      });
    });
  });
});
