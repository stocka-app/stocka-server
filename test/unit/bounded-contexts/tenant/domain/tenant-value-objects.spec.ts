import { TierVO, TierEnum } from '@tenant/domain/value-objects/tier.vo';
import { TenantStatusVO, TenantStatusEnum } from '@tenant/domain/value-objects/tenant-status.vo';
import { SlugVO } from '@tenant/domain/value-objects/slug.vo';
import { BusinessTypeVO, BusinessTypeEnum } from '@tenant/domain/value-objects/business-type.vo';
import { MemberRoleVO, MemberRoleEnum } from '@tenant/domain/value-objects/member-role.vo';
import { MemberStatusVO, MemberStatusEnum } from '@tenant/domain/value-objects/member-status.vo';

// ── TierVO ─────────────────────────────────────────────────────────────────────

describe('TierVO', () => {
  describe('Given a valid tier string', () => {
    describe('When TierVO.fromString is called', () => {
      it('Then it creates a TierVO for each valid tier', () => {
        for (const tier of Object.values(TierEnum)) {
          const vo = TierVO.fromString(tier);
          expect(vo.toString()).toBe(tier);
        }
      });
    });
  });

  describe('Given an invalid tier string', () => {
    describe('When TierVO.fromString is called', () => {
      it('Then it throws an error', () => {
        expect(() => TierVO.fromString('INVALID')).toThrow('Invalid Tier value: INVALID');
      });
    });
  });

  describe('Given static factory methods', () => {
    describe('When creating tiers via factory', () => {
      it('Then TierVO.free() returns FREE', () => {
        expect(TierVO.free().toString()).toBe('FREE');
        expect(TierVO.free().isFree()).toBe(true);
      });

      it('Then TierVO.starter() returns STARTER', () => {
        expect(TierVO.starter().toString()).toBe('STARTER');
        expect(TierVO.starter().isStarter()).toBe(true);
      });

      it('Then TierVO.growth() returns GROWTH', () => {
        expect(TierVO.growth().toString()).toBe('GROWTH');
        expect(TierVO.growth().isGrowth()).toBe(true);
      });

      it('Then TierVO.enterprise() returns ENTERPRISE', () => {
        expect(TierVO.enterprise().toString()).toBe('ENTERPRISE');
        expect(TierVO.enterprise().isEnterprise()).toBe(true);
      });
    });
  });

  describe('Given two TierVOs with the same value', () => {
    describe('When equals is called', () => {
      it('Then it returns true', () => {
        expect(TierVO.free().equals(TierVO.free())).toBe(true);
      });
    });
  });

  describe('Given two TierVOs with different values', () => {
    describe('When equals is called', () => {
      it('Then it returns false', () => {
        expect(TierVO.free().equals(TierVO.starter())).toBe(false);
      });
    });
  });

  describe('Given a non-free tier', () => {
    describe('When isFree is called', () => {
      it('Then it returns false', () => {
        expect(TierVO.starter().isFree()).toBe(false);
        expect(TierVO.growth().isFree()).toBe(false);
        expect(TierVO.enterprise().isFree()).toBe(false);
      });
    });
  });
});

// ── TenantStatusVO ─────────────────────────────────────────────────────────────

describe('TenantStatusVO', () => {
  describe('Given a valid status string', () => {
    describe('When TenantStatusVO.fromString is called', () => {
      it('Then it creates a TenantStatusVO for each valid status', () => {
        for (const status of Object.values(TenantStatusEnum)) {
          const vo = TenantStatusVO.fromString(status);
          expect(vo.toString()).toBe(status);
        }
      });
    });
  });

  describe('Given an invalid status string', () => {
    describe('When TenantStatusVO.fromString is called', () => {
      it('Then it throws an error', () => {
        expect(() => TenantStatusVO.fromString('INVALID')).toThrow(
          'Invalid TenantStatus value: INVALID',
        );
      });
    });
  });

  describe('Given factory methods', () => {
    describe('When creating statuses', () => {
      it('Then active() returns active status', () => {
        const vo = TenantStatusVO.active();
        expect(vo.isActive()).toBe(true);
        expect(vo.isSuspended()).toBe(false);
        expect(vo.isCancelled()).toBe(false);
      });

      it('Then suspended() returns suspended status', () => {
        const vo = TenantStatusVO.suspended();
        expect(vo.isActive()).toBe(false);
        expect(vo.isSuspended()).toBe(true);
        expect(vo.isCancelled()).toBe(false);
      });

      it('Then cancelled() returns cancelled status', () => {
        const vo = TenantStatusVO.cancelled();
        expect(vo.isActive()).toBe(false);
        expect(vo.isSuspended()).toBe(false);
        expect(vo.isCancelled()).toBe(true);
      });
    });
  });

  describe('Given two TenantStatusVOs with the same value', () => {
    describe('When equals is called', () => {
      it('Then it returns true', () => {
        expect(TenantStatusVO.active().equals(TenantStatusVO.active())).toBe(true);
      });
    });
  });

  describe('Given two TenantStatusVOs with different values', () => {
    describe('When equals is called', () => {
      it('Then it returns false', () => {
        expect(TenantStatusVO.active().equals(TenantStatusVO.suspended())).toBe(false);
      });
    });
  });
});

// ── SlugVO ─────────────────────────────────────────────────────────────────────

describe('SlugVO', () => {
  describe('Given a valid slug string', () => {
    describe('When SlugVO.fromString is called', () => {
      it('Then it creates a SlugVO', () => {
        const vo = SlugVO.fromString('mi-tienda-123');
        expect(vo.toString()).toBe('mi-tienda-123');
      });
    });
  });

  describe('Given a slug that is too short', () => {
    describe('When SlugVO.fromString is called', () => {
      it('Then it throws an error', () => {
        expect(() => SlugVO.fromString('ab')).toThrow('Invalid slug: ab');
      });
    });
  });

  describe('Given a slug with uppercase letters', () => {
    describe('When SlugVO.fromString is called', () => {
      it('Then it throws an error', () => {
        expect(() => SlugVO.fromString('My-Tienda')).toThrow('Invalid slug: My-Tienda');
      });
    });
  });

  describe('Given a slug starting with a hyphen', () => {
    describe('When SlugVO.fromString is called', () => {
      it('Then it throws an error', () => {
        expect(() => SlugVO.fromString('-my-tienda')).toThrow('Invalid slug: -my-tienda');
      });
    });
  });

  describe('Given a business name', () => {
    describe('When SlugVO.fromName is called', () => {
      it('Then it generates a valid slug', () => {
        const vo = SlugVO.fromName('Mi Tienda Bonita');
        expect(vo.toString()).toBe('mi-tienda-bonita');
      });
    });
  });

  describe('Given a name with accented characters', () => {
    describe('When SlugVO.fromName is called', () => {
      it('Then it strips accents and generates a valid slug', () => {
        const vo = SlugVO.fromName('Panadería El Sol');
        expect(vo.toString()).toBe('panaderia-el-sol');
      });
    });
  });

  describe('Given a name with special characters', () => {
    describe('When SlugVO.fromName is called', () => {
      it('Then it removes special chars and generates a valid slug', () => {
        const vo = SlugVO.fromName('Tech & Co. #1');
        expect(vo.toString()).toBe('tech-co-1');
      });
    });
  });

  describe('Given a name that is too short to create a valid slug', () => {
    describe('When SlugVO.fromName is called', () => {
      it('Then it throws an error', () => {
        expect(() => SlugVO.fromName('ab')).toThrow('Cannot generate a valid slug from name: ab');
      });
    });
  });

  describe('Given two slugs with the same value', () => {
    describe('When equals is called', () => {
      it('Then it returns true', () => {
        const a = SlugVO.fromString('mi-tienda');
        const b = SlugVO.fromString('mi-tienda');
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  describe('Given two slugs with different values', () => {
    describe('When equals is called', () => {
      it('Then it returns false', () => {
        const a = SlugVO.fromString('mi-tienda');
        const b = SlugVO.fromString('tu-tienda');
        expect(a.equals(b)).toBe(false);
      });
    });
  });
});

// ── BusinessTypeVO ─────────────────────────────────────────────────────────────

describe('BusinessTypeVO', () => {
  describe('Given a valid business type string', () => {
    describe('When BusinessTypeVO.fromString is called', () => {
      it('Then it creates a BusinessTypeVO for each valid type', () => {
        for (const type of Object.values(BusinessTypeEnum)) {
          const vo = BusinessTypeVO.fromString(type);
          expect(vo.toString()).toBe(type);
        }
      });
    });
  });

  describe('Given an invalid business type string', () => {
    describe('When BusinessTypeVO.fromString is called', () => {
      it('Then it throws an error', () => {
        expect(() => BusinessTypeVO.fromString('INVALID')).toThrow(
          'Invalid BusinessType value: INVALID',
        );
      });
    });
  });

  describe('Given two BusinessTypeVOs with the same value', () => {
    describe('When equals is called', () => {
      it('Then it returns true', () => {
        const a = BusinessTypeVO.fromString('retail');
        const b = BusinessTypeVO.fromString('retail');
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  describe('Given two BusinessTypeVOs with different values', () => {
    describe('When equals is called', () => {
      it('Then it returns false', () => {
        const a = BusinessTypeVO.fromString('retail');
        const b = BusinessTypeVO.fromString('food');
        expect(a.equals(b)).toBe(false);
      });
    });
  });
});

// ── MemberRoleVO ───────────────────────────────────────────────────────────────

describe('MemberRoleVO', () => {
  describe('Given a valid role string', () => {
    describe('When MemberRoleVO.fromString is called', () => {
      it('Then it creates a MemberRoleVO for each valid role', () => {
        for (const role of Object.values(MemberRoleEnum)) {
          const vo = MemberRoleVO.fromString(role);
          expect(vo.toString()).toBe(role);
        }
      });
    });
  });

  describe('Given an invalid role string', () => {
    describe('When MemberRoleVO.fromString is called', () => {
      it('Then it throws an error', () => {
        expect(() => MemberRoleVO.fromString('INVALID')).toThrow(
          'Invalid MemberRole value: INVALID',
        );
      });
    });
  });

  describe('Given factory methods', () => {
    describe('When creating roles', () => {
      it('Then MemberRoleVO.owner() returns OWNER', () => {
        const vo = MemberRoleVO.owner();
        expect(vo.isOwner()).toBe(true);
        expect(vo.isPartner()).toBe(false);
        expect(vo.isManager()).toBe(false);
        expect(vo.toString()).toBe('OWNER');
      });

      it('Then MemberRoleVO.viewer() returns VIEWER', () => {
        const vo = MemberRoleVO.viewer();
        expect(vo.isOwner()).toBe(false);
        expect(vo.toString()).toBe('VIEWER');
      });
    });
  });

  describe('Given two MemberRoleVOs with the same value', () => {
    describe('When equals is called', () => {
      it('Then it returns true', () => {
        expect(MemberRoleVO.owner().equals(MemberRoleVO.owner())).toBe(true);
      });
    });
  });

  describe('Given two MemberRoleVOs with different values', () => {
    describe('When equals is called', () => {
      it('Then it returns false', () => {
        expect(MemberRoleVO.owner().equals(MemberRoleVO.viewer())).toBe(false);
      });
    });
  });
});

// ── MemberStatusVO ─────────────────────────────────────────────────────────────

describe('MemberStatusVO', () => {
  describe('Given a valid status string', () => {
    describe('When MemberStatusVO.fromString is called', () => {
      it('Then it creates a MemberStatusVO for each valid status', () => {
        for (const status of Object.values(MemberStatusEnum)) {
          const vo = MemberStatusVO.fromString(status);
          expect(vo.toString()).toBe(status);
        }
      });
    });
  });

  describe('Given an invalid status string', () => {
    describe('When MemberStatusVO.fromString is called', () => {
      it('Then it throws an error', () => {
        expect(() => MemberStatusVO.fromString('INVALID')).toThrow(
          'Invalid MemberStatus value: INVALID',
        );
      });
    });
  });

  describe('Given factory methods', () => {
    describe('When creating statuses', () => {
      it('Then MemberStatusVO.active() returns active', () => {
        const vo = MemberStatusVO.active();
        expect(vo.isActive()).toBe(true);
        expect(vo.isPending()).toBe(false);
        expect(vo.isSuspended()).toBe(false);
      });

      it('Then MemberStatusVO.pending() returns pending', () => {
        const vo = MemberStatusVO.pending();
        expect(vo.isActive()).toBe(false);
        expect(vo.isPending()).toBe(true);
        expect(vo.isSuspended()).toBe(false);
      });

      it('Then MemberStatusVO.suspended() returns suspended', () => {
        const vo = MemberStatusVO.suspended();
        expect(vo.isActive()).toBe(false);
        expect(vo.isPending()).toBe(false);
        expect(vo.isSuspended()).toBe(true);
      });
    });
  });

  describe('Given two MemberStatusVOs with the same value', () => {
    describe('When equals is called', () => {
      it('Then it returns true', () => {
        expect(MemberStatusVO.active().equals(MemberStatusVO.active())).toBe(true);
      });
    });
  });

  describe('Given two MemberStatusVOs with different values', () => {
    describe('When equals is called', () => {
      it('Then it returns false', () => {
        expect(MemberStatusVO.active().equals(MemberStatusVO.pending())).toBe(false);
      });
    });
  });
});
