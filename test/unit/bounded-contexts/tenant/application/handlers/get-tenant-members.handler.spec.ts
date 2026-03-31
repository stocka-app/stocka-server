import { GetTenantMembersHandler } from '@tenant/application/queries/get-tenant-members/get-tenant-members.handler';
import { GetTenantMembersQuery } from '@tenant/application/queries/get-tenant-members/get-tenant-members.query';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GetTenantMembersHandler', () => {
  let handler: GetTenantMembersHandler;
  let memberContract: jest.Mocked<ITenantMemberContract>;

  beforeEach(() => {
    memberContract = {
      findActiveByUserUUID: jest.fn(),
      findAllByTenantId: jest.fn(),
      findByTenantAndUserId: jest.fn(),
      persist: jest.fn(),
    };

    handler = new GetTenantMembersHandler(memberContract);
  });

  describe('Given no members exist for the tenant', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        memberContract.findAllByTenantId.mockResolvedValue([]);
      });

      it('Then it returns an empty list wrapped in ok', async () => {
        const query = new GetTenantMembersQuery(1);
        const result = await handler.execute(query);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toEqual([]);
      });
    });
  });

  describe('Given members exist for the tenant', () => {
    describe('When execute is called', () => {
      let members: TenantMemberModel[];

      beforeEach(() => {
        members = [
          TenantMemberModel.create({ tenantId: 1, userId: 10, userUUID: 'u-1', role: 'OWNER' }),
          TenantMemberModel.create({ tenantId: 1, userId: 11, userUUID: 'u-2', role: 'VIEWER' }),
        ];
        memberContract.findAllByTenantId.mockResolvedValue(members);
      });

      it('Then it returns all members wrapped in ok', async () => {
        const query = new GetTenantMembersQuery(1);
        const result = await handler.execute(query);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toHaveLength(2);
      });

      it('Then it queries members for the correct tenantId', async () => {
        const query = new GetTenantMembersQuery(5);
        await handler.execute(query);

        expect(memberContract.findAllByTenantId).toHaveBeenCalledWith(5);
      });
    });
  });
});
