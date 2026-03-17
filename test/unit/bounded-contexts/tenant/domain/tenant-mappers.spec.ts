import { TenantMapper } from '@tenant/infrastructure/mappers/tenant.mapper';
import { TenantMemberMapper } from '@tenant/infrastructure/mappers/tenant-member.mapper';
import { TenantProfileMapper } from '@tenant/infrastructure/mappers/tenant-profile.mapper';
import { TenantConfigMapper } from '@tenant/infrastructure/mappers/tenant-config.mapper';
import { TenantEntity } from '@tenant/infrastructure/entities/tenant.entity';
import { TenantMemberEntity } from '@tenant/infrastructure/entities/tenant-member.entity';
import { TenantProfileEntity } from '@tenant/infrastructure/entities/tenant-profile.entity';
import { TenantConfigEntity } from '@tenant/infrastructure/entities/tenant-config.entity';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { TenantProfileModel } from '@tenant/domain/models/tenant-profile.model';
import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';
import { SlugVO } from '@tenant/domain/value-objects/slug.vo';
import { BusinessTypeVO } from '@tenant/domain/value-objects/business-type.vo';

// ── TenantMapper ───────────────────────────────────────────────────────────────

describe('TenantMapper', () => {
  describe('Given a TenantEntity-like object', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a TenantAggregate with all fields mapped', () => {
        const entity = {
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Mi Tienda',
          slug: 'mi-tienda',
          businessType: 'retail',
          country: 'MX',
          timezone: 'America/Mexico_City',
          status: 'active',
          ownerUserId: 42,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        };

        const aggregate = TenantMapper.toDomain(entity as TenantEntity);
        expect(aggregate.id).toBe(1);
        expect(aggregate.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(aggregate.name).toBe('Mi Tienda');
        expect(aggregate.slug).toBe('mi-tienda');
        expect(aggregate.businessType).toBe('retail');
        expect(aggregate.country).toBe('MX');
        expect(aggregate.ownerUserId).toBe(42);
      });
    });
  });

  describe('Given a TenantAggregate', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity with all fields mapped', () => {
        const aggregate = TenantAggregate.create({
          name: 'Mi Tienda',
          slug: SlugVO.fromName('Mi Tienda'),
          businessType: BusinessTypeVO.fromString('retail'),
          country: 'MX',
          timezone: 'America/Mexico_City',
          ownerUserId: 42,
        });

        const entity = TenantMapper.toEntity(aggregate);
        expect(entity.uuid).toBeDefined();
        expect(entity.name).toBe('Mi Tienda');
        expect(entity.slug).toBe('mi-tienda');
        expect(entity.businessType).toBe('retail');
        expect(entity.country).toBe('MX');
        expect(entity.timezone).toBe('America/Mexico_City');
        expect(entity.status).toBe('active');
        expect(entity.ownerUserId).toBe(42);
        expect(entity.id).toBeUndefined();
      });
    });
  });
});

// ── TenantMemberMapper ─────────────────────────────────────────────────────────

describe('TenantMemberMapper', () => {
  describe('Given a TenantMemberEntity-like object', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a TenantMemberModel with all fields mapped', () => {
        const entity = {
          id: 10,
          uuid: '550e8400-e29b-41d4-a716-446655440001',
          tenantId: 1,
          userId: 42,
          userUUID: '550e8400-e29b-41d4-a716-446655440000',
          role: 'OWNER',
          status: 'active',
          invitedBy: null,
          joinedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        };

        const model = TenantMemberMapper.toDomain(entity as TenantMemberEntity);
        expect(model.id).toBe(10);
        expect(model.tenantId).toBe(1);
        expect(model.userId).toBe(42);
        expect(model.role.toString()).toBe('OWNER');
        expect(model.status.toString()).toBe('active');
      });
    });
  });

  describe('Given a TenantMemberModel', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity with all fields mapped', () => {
        const model = TenantMemberModel.create({
          tenantId: 1,
          userId: 42,
          userUUID: '550e8400-e29b-41d4-a716-446655440000',
          role: 'OWNER',
        });

        const entity = TenantMemberMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.tenantId).toBe(1);
        expect(entity.userId).toBe(42);
        expect(entity.role).toBe('OWNER');
        expect(entity.status).toBe('active');
        expect(entity.id).toBeUndefined();
      });
    });
  });
});

// ── TenantProfileMapper ────────────────────────────────────────────────────────

describe('TenantProfileMapper', () => {
  describe('Given a TenantProfileEntity-like object', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a TenantProfileModel with all fields mapped', () => {
        const entity = {
          id: 5,
          uuid: '550e8400-e29b-41d4-a716-446655440002',
          tenantId: 1,
          giro: 'Tech',
          phone: '+521234567890',
          contactEmail: 'info@tienda.com',
          website: 'https://tienda.com',
          addressLine1: 'Calle 1',
          city: 'CDMX',
          state: 'CDMX',
          postalCode: '06600',
          logoUrl: 'https://cdn.example.com/logo.png',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        };

        const model = TenantProfileMapper.toDomain(entity as TenantProfileEntity);
        expect(model.id).toBe(5);
        expect(model.tenantId).toBe(1);
        expect(model.giro).toBe('Tech');
        expect(model.phone).toBe('+521234567890');
        expect(model.city).toBe('CDMX');
      });
    });
  });

  describe('Given a TenantProfileModel', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity', () => {
        const model = TenantProfileModel.createEmpty(1);
        const entity = TenantProfileMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.tenantId).toBe(1);
        expect(entity.giro).toBeNull();
        expect(entity.id).toBeUndefined();
      });
    });
  });
});

// ── TenantConfigMapper ─────────────────────────────────────────────────────────

describe('TenantConfigMapper', () => {
  describe('Given a TenantConfigEntity-like object', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a TenantConfigModel with all fields mapped', () => {
        const entity = {
          id: 3,
          uuid: '550e8400-e29b-41d4-a716-446655440003',
          tenantId: 1,
          tier: 'FREE',
          maxWarehouses: 0,
          maxUsers: 1,
          maxProducts: 100,
          notificationsEnabled: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        };

        const model = TenantConfigMapper.toDomain(entity as TenantConfigEntity);
        expect(model.id).toBe(3);
        expect(model.tenantId).toBe(1);
        expect(model.tier.toString()).toBe('FREE');
        expect(model.maxWarehouses).toBe(0);
        expect(model.maxUsers).toBe(1);
        expect(model.maxProducts).toBe(100);
        expect(model.notificationsEnabled).toBe(true);
      });
    });
  });

  describe('Given a TenantConfigModel', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity', () => {
        const model = TenantConfigModel.createFreeDefaults(1);
        const entity = TenantConfigMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.tenantId).toBe(1);
        expect(entity.tier).toBe('FREE');
        expect(entity.maxWarehouses).toBe(0);
        expect(entity.id).toBeUndefined();
      });
    });
  });
});
