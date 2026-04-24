import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { SlugVO } from '@tenant/domain/value-objects/slug.vo';
import { BusinessTypeVO } from '@tenant/domain/value-objects/business-type.vo';
import { TenantCreatedEvent } from '@tenant/domain/events/tenant-created.event';

function buildPersistedTenant(
  overrides?: Partial<Parameters<typeof TenantAggregate.reconstitute>[0]>,
) {
  return TenantAggregate.reconstitute({
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
    ...overrides,
  });
}

describe('TenantAggregate', () => {
  describe('Given TenantAggregate.create() is called with valid props', () => {
    describe('When a new tenant is created', () => {
      let tenant: TenantAggregate;

      beforeEach(() => {
        tenant = TenantAggregate.create({
          name: 'Mi Tienda',
          slug: SlugVO.fromName('Mi Tienda'),
          businessType: BusinessTypeVO.fromString('retail'),
          country: 'MX',
          timezone: 'America/Mexico_City',
          ownerUserId: 42,
        });
      });

      it('Then the tenant has a uuid and no id (not yet persisted)', () => {
        expect(tenant.uuid).toBeDefined();
        expect(tenant.id).toBeUndefined();
      });

      it('Then the tenant name and slug are set correctly', () => {
        expect(tenant.name.getValue()).toBe('Mi Tienda');
        expect(tenant.slug).toBe('mi-tienda');
      });

      it('Then the business type is set correctly', () => {
        expect(tenant.businessType).toBe('retail');
      });

      it('Then the country and timezone are set correctly', () => {
        expect(tenant.country.getValue()).toBe('MX');
        expect(tenant.timezone.getValue()).toBe('America/Mexico_City');
      });

      it('Then the status is active', () => {
        expect(tenant.status).toBe('active');
        expect(tenant.isActive()).toBe(true);
      });

      it('Then the ownerUserId is set', () => {
        expect(tenant.ownerUserId).toBe(42);
      });

      it('Then the tenant is not archived', () => {
        expect(tenant.isArchived()).toBe(false);
      });

      it('Then exactly one TenantCreatedEvent is emitted', () => {
        const events = tenant.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(TenantCreatedEvent);
      });

      it('Then the TenantCreatedEvent carries correct data', () => {
        const event = tenant.getUncommittedEvents()[0] as TenantCreatedEvent;
        expect(event.tenantUUID).toBe(tenant.uuid);
        expect(event.name).toBe('Mi Tienda');
        expect(event.slug).toBe('mi-tienda');
      });
    });
  });

  describe('Given TenantAggregate.reconstitute() is called with persisted data', () => {
    describe('When the aggregate is hydrated from storage', () => {
      it('Then id and uuid are preserved', () => {
        const tenant = buildPersistedTenant();
        expect(tenant.id).toBe(1);
        expect(tenant.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
      });

      it('Then no domain events are emitted', () => {
        const tenant = buildPersistedTenant();
        expect(tenant.getUncommittedEvents()).toHaveLength(0);
      });

      it('Then all properties are restored', () => {
        const tenant = buildPersistedTenant();
        expect(tenant.name.getValue()).toBe('Mi Tienda');
        expect(tenant.slug).toBe('mi-tienda');
        expect(tenant.businessType).toBe('retail');
        expect(tenant.country.getValue()).toBe('MX');
        expect(tenant.timezone.getValue()).toBe('America/Mexico_City');
        expect(tenant.status).toBe('active');
        expect(tenant.ownerUserId).toBe(42);
      });
    });
  });

  describe('Given an active tenant', () => {
    describe('When updateName is called', () => {
      it('Then the name is updated and updatedAt changes', () => {
        const tenant = buildPersistedTenant();
        const originalUpdatedAt = tenant.updatedAt;
        tenant.updateName('Mi Nueva Tienda');
        expect(tenant.name.getValue()).toBe('Mi Nueva Tienda');
        expect(tenant.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      });
    });

    describe('When suspend is called', () => {
      it('Then the status changes to suspended', () => {
        const tenant = buildPersistedTenant();
        tenant.suspend();
        expect(tenant.status).toBe('suspended');
        expect(tenant.isActive()).toBe(false);
      });
    });

    describe('When cancel is called', () => {
      it('Then the status changes to cancelled', () => {
        const tenant = buildPersistedTenant();
        tenant.cancel();
        expect(tenant.status).toBe('cancelled');
        expect(tenant.isActive()).toBe(false);
      });
    });
  });

  describe('Given a cancelled tenant', () => {
    describe('When suspend is called', () => {
      it('Then it throws an error', () => {
        const tenant = buildPersistedTenant({ status: 'cancelled' });
        expect(() => tenant.suspend()).toThrow('Cannot suspend a cancelled tenant');
      });
    });

    describe('When cancel is called again', () => {
      it('Then it throws an error', () => {
        const tenant = buildPersistedTenant({ status: 'cancelled' });
        expect(() => tenant.cancel()).toThrow('Tenant is already cancelled');
      });
    });
  });

  describe('Given a suspended tenant', () => {
    describe('When cancel is called', () => {
      it('Then the status changes to cancelled', () => {
        const tenant = buildPersistedTenant({ status: 'suspended' });
        tenant.cancel();
        expect(tenant.status).toBe('cancelled');
      });
    });
  });
});
