import { JobTitleVO } from '@user/profile/domain/value-objects/job-title.vo';
import { ProviderProfileUrlVO } from '@user/profile/domain/value-objects/provider-profile-url.vo';

describe('JobTitleVO', () => {
  describe('Given a valid title', () => {
    describe('When create() is called', () => {
      it('Then it returns a VO that exposes the trimmed value', () => {
        const vo = JobTitleVO.create('  Senior Engineer  ');
        expect(vo.getValue()).toBe('Senior Engineer');
      });
    });
  });

  describe('Given an empty string', () => {
    describe('When create() is called', () => {
      it('Then it throws "JobTitle cannot be empty"', () => {
        expect(() => JobTitleVO.create('   ')).toThrow('JobTitle cannot be empty');
      });
    });
  });

  describe('Given a title longer than 100 characters', () => {
    describe('When create() is called', () => {
      it('Then it throws a length-bound error', () => {
        const tooLong = 'A'.repeat(101);
        expect(() => JobTitleVO.create(tooLong)).toThrow('JobTitle cannot exceed 100 characters');
      });
    });
  });

  describe('Given a title exactly at the boundary', () => {
    describe('When create() is called', () => {
      it('Then it returns a VO at the maximum length without throwing', () => {
        const exactly100 = 'A'.repeat(100);
        const vo = JobTitleVO.create(exactly100);
        expect(vo.getValue()).toBe(exactly100);
      });
    });
  });
});

describe('ProviderProfileUrlVO', () => {
  describe('Given a valid url', () => {
    describe('When create() is called', () => {
      it('Then it returns a VO that exposes the trimmed value', () => {
        const vo = ProviderProfileUrlVO.create('  https://google.com/profile/123  ');
        expect(vo.getValue()).toBe('https://google.com/profile/123');
      });
    });
  });

  describe('Given an empty string', () => {
    describe('When create() is called', () => {
      it('Then it throws "ProviderProfileUrl cannot be empty"', () => {
        expect(() => ProviderProfileUrlVO.create('   ')).toThrow(
          'ProviderProfileUrl cannot be empty',
        );
      });
    });
  });

  describe('Given a url longer than 500 characters', () => {
    describe('When create() is called', () => {
      it('Then it throws a length-bound error', () => {
        const tooLong = 'https://example.com/' + 'a'.repeat(500);
        expect(() => ProviderProfileUrlVO.create(tooLong)).toThrow(
          'ProviderProfileUrl cannot exceed 500 characters',
        );
      });
    });
  });

  describe('Given a url exactly at the boundary', () => {
    describe('When create() is called', () => {
      it('Then it returns a VO at the maximum length without throwing', () => {
        const exactly500 = 'a'.repeat(500);
        const vo = ProviderProfileUrlVO.create(exactly500);
        expect(vo.getValue()).toBe(exactly500);
      });
    });
  });
});
