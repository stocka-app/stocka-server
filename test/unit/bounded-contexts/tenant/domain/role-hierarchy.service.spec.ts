import { RoleHierarchyService } from '@tenant/domain/services/role-hierarchy.service';
import { IRbacPolicyPort } from '@shared/domain/policy/rbac-policy.port';

// ── Mock assignable-roles data (mirrors the DB seed) ──────────────────────────

const ASSIGNABLE_ROLES: Record<string, readonly string[]> = {
  OWNER: ['PARTNER', 'MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'],
  PARTNER: ['MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'],
  MANAGER: ['BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'],
  BUYER: [],
  WAREHOUSE_KEEPER: [],
  SALES_REP: [],
  VIEWER: [],
};

function createMockRbacPolicyPort(): IRbacPolicyPort {
  return {
    getRoleActions: jest.fn(() => Promise.resolve(new Set<string>())),
    getActionTierRequirements: jest.fn(() => Promise.resolve({})),
    getTierNumericLimits: jest.fn(() => Promise.resolve({})),
    getTierOrder: jest.fn(() => Promise.resolve({})),
    getActionLimitChecks: jest.fn(() => Promise.resolve({})),
    getAssignableRoles: jest.fn((roleKey: string) =>
      Promise.resolve(ASSIGNABLE_ROLES[roleKey] ?? []),
    ),
    getUserGrants: jest.fn(() => Promise.resolve([])),
  };
}

describe('RoleHierarchyService', () => {
  let service: RoleHierarchyService;

  beforeEach(() => {
    const mockPort = createMockRbacPolicyPort();
    service = new RoleHierarchyService(mockPort);
  });

  describe('Given the inviter is an OWNER', () => {
    describe('When assigning each allowed role', () => {
      it.each(['PARTNER', 'MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'])(
        'Then it allows assigning %s',
        async (targetRole) => {
          await expect(service.canAssignRole('OWNER', targetRole)).resolves.toBe(true);
        },
      );
    });

    describe('When trying to assign OWNER', () => {
      it('Then it rejects the assignment', async () => {
        await expect(service.canAssignRole('OWNER', 'OWNER')).resolves.toBe(false);
      });
    });
  });

  describe('Given the inviter is a PARTNER', () => {
    describe('When assigning each allowed role', () => {
      it.each(['MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'])(
        'Then it allows assigning %s',
        async (targetRole) => {
          await expect(service.canAssignRole('PARTNER', targetRole)).resolves.toBe(true);
        },
      );
    });

    describe('When trying to assign OWNER or PARTNER', () => {
      it.each(['OWNER', 'PARTNER'])('Then it rejects assigning %s', async (targetRole) => {
        await expect(service.canAssignRole('PARTNER', targetRole)).resolves.toBe(false);
      });
    });
  });

  describe('Given the inviter is a MANAGER', () => {
    describe('When assigning each allowed role', () => {
      it.each(['BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'])(
        'Then it allows assigning %s',
        async (targetRole) => {
          await expect(service.canAssignRole('MANAGER', targetRole)).resolves.toBe(true);
        },
      );
    });

    describe('When trying to assign OWNER, PARTNER, or MANAGER', () => {
      it.each(['OWNER', 'PARTNER', 'MANAGER'])(
        'Then it rejects assigning %s',
        async (targetRole) => {
          await expect(service.canAssignRole('MANAGER', targetRole)).resolves.toBe(false);
        },
      );
    });
  });

  describe('Given the inviter is a BUYER', () => {
    describe('When trying to assign any role', () => {
      it.each(['OWNER', 'PARTNER', 'MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'])(
        'Then it rejects assigning %s',
        async (targetRole) => {
          await expect(service.canAssignRole('BUYER', targetRole)).resolves.toBe(false);
        },
      );
    });
  });

  describe('Given the inviter is a WAREHOUSE_KEEPER', () => {
    describe('When trying to assign any role', () => {
      it('Then it rejects assigning VIEWER', async () => {
        await expect(service.canAssignRole('WAREHOUSE_KEEPER', 'VIEWER')).resolves.toBe(false);
      });
    });
  });

  describe('Given the inviter is a VIEWER', () => {
    describe('When trying to assign any role', () => {
      it('Then it rejects assigning VIEWER', async () => {
        await expect(service.canAssignRole('VIEWER', 'VIEWER')).resolves.toBe(false);
      });
    });
  });

  describe('Given an unknown inviter role', () => {
    describe('When trying to assign any role', () => {
      it('Then it rejects the assignment', async () => {
        await expect(service.canAssignRole('UNKNOWN_ROLE', 'VIEWER')).resolves.toBe(false);
      });
    });
  });
});
