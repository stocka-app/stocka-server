import { canAssignRole } from '@tenant/domain/services/role-hierarchy.service';

describe('canAssignRole', () => {
  describe('Given the inviter is an OWNER', () => {
    describe('When assigning each allowed role', () => {
      it.each(['PARTNER', 'MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'])(
        'Then it allows assigning %s',
        (targetRole) => {
          expect(canAssignRole('OWNER', targetRole)).toBe(true);
        },
      );
    });

    describe('When trying to assign OWNER', () => {
      it('Then it rejects the assignment', () => {
        expect(canAssignRole('OWNER', 'OWNER')).toBe(false);
      });
    });
  });

  describe('Given the inviter is a PARTNER', () => {
    describe('When assigning each allowed role', () => {
      it.each(['MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'])(
        'Then it allows assigning %s',
        (targetRole) => {
          expect(canAssignRole('PARTNER', targetRole)).toBe(true);
        },
      );
    });

    describe('When trying to assign OWNER or PARTNER', () => {
      it.each(['OWNER', 'PARTNER'])('Then it rejects assigning %s', (targetRole) => {
        expect(canAssignRole('PARTNER', targetRole)).toBe(false);
      });
    });
  });

  describe('Given the inviter is a MANAGER', () => {
    describe('When assigning each allowed role', () => {
      it.each(['BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'])(
        'Then it allows assigning %s',
        (targetRole) => {
          expect(canAssignRole('MANAGER', targetRole)).toBe(true);
        },
      );
    });

    describe('When trying to assign OWNER, PARTNER, or MANAGER', () => {
      it.each(['OWNER', 'PARTNER', 'MANAGER'])('Then it rejects assigning %s', (targetRole) => {
        expect(canAssignRole('MANAGER', targetRole)).toBe(false);
      });
    });
  });

  describe('Given the inviter is a BUYER', () => {
    describe('When trying to assign any role', () => {
      it.each(['OWNER', 'PARTNER', 'MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'])(
        'Then it rejects assigning %s',
        (targetRole) => {
          expect(canAssignRole('BUYER', targetRole)).toBe(false);
        },
      );
    });
  });

  describe('Given the inviter is a WAREHOUSE_KEEPER', () => {
    describe('When trying to assign any role', () => {
      it('Then it rejects assigning VIEWER', () => {
        expect(canAssignRole('WAREHOUSE_KEEPER', 'VIEWER')).toBe(false);
      });
    });
  });

  describe('Given the inviter is a VIEWER', () => {
    describe('When trying to assign any role', () => {
      it('Then it rejects assigning VIEWER', () => {
        expect(canAssignRole('VIEWER', 'VIEWER')).toBe(false);
      });
    });
  });

  describe('Given an unknown inviter role', () => {
    describe('When trying to assign any role', () => {
      it('Then it rejects the assignment', () => {
        expect(canAssignRole('UNKNOWN_ROLE', 'VIEWER')).toBe(false);
      });
    });
  });
});
