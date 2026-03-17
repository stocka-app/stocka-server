import { TenantCreatedEvent } from '@tenant/domain/events/tenant-created.event';
import { MemberAddedEvent } from '@tenant/domain/events/member-added.event';

describe('Tenant Domain Events', () => {
  describe('Given TenantCreatedEvent', () => {
    describe('When instantiated', () => {
      it('Then it carries all the provided data', () => {
        const event = new TenantCreatedEvent('tenant-uuid', 'owner-uuid', 'Mi Tienda', 'mi-tienda');
        expect(event.tenantUUID).toBe('tenant-uuid');
        expect(event.ownerUserUUID).toBe('owner-uuid');
        expect(event.name).toBe('Mi Tienda');
        expect(event.slug).toBe('mi-tienda');
      });
    });
  });

  describe('Given MemberAddedEvent', () => {
    describe('When instantiated', () => {
      it('Then it carries all the provided data', () => {
        const event = new MemberAddedEvent('tenant-uuid', 'user-uuid', 'OWNER');
        expect(event.tenantUUID).toBe('tenant-uuid');
        expect(event.userUUID).toBe('user-uuid');
        expect(event.role).toBe('OWNER');
      });
    });
  });
});
