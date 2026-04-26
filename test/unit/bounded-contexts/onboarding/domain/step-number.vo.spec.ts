import { StepNumberVO } from '@onboarding/domain/value-objects/step-number.vo';

describe('StepNumberVO', () => {
  describe('Given a valid non-negative integer', () => {
    describe('When create() is called', () => {
      it('Then it returns a VO that exposes the value', () => {
        const vo = StepNumberVO.create(2);
        expect(vo.getValue()).toBe(2);
      });
    });
  });

  describe('Given zero', () => {
    describe('When create() is called', () => {
      it('Then it accepts the value', () => {
        expect(() => StepNumberVO.create(0)).not.toThrow();
      });
    });
  });

  describe('Given a negative integer', () => {
    describe('When create() is called', () => {
      it('Then it throws "Step number must be a non-negative integer"', () => {
        expect(() => StepNumberVO.create(-1)).toThrow('Step number must be a non-negative integer');
      });
    });
  });

  describe('Given a non-integer (decimal)', () => {
    describe('When create() is called', () => {
      it('Then it throws "Step number must be a non-negative integer"', () => {
        expect(() => StepNumberVO.create(1.5)).toThrow(
          'Step number must be a non-negative integer',
        );
      });
    });
  });
});
