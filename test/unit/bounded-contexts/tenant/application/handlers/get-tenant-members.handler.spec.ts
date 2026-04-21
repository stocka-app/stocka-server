import { GetTenantMembersHandler } from '@tenant/application/queries/get-tenant-members/get-tenant-members.handler';
import { GetTenantMembersQuery } from '@tenant/application/queries/get-tenant-members/get-tenant-members.query';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { asPersisted } from '@test/helpers/persisted';

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
      let members: Persisted<TenantMemberModel>[];

      beforeEach(() => {
        members = [
          asPersisted(
            TenantMemberModel.create({
              tenantId: 1,
              userId: 10,
              userUUID: '019538a0-0000-7000-8000-000000000901',
              role: 'OWNER',
            }),
            1,
          ),
          asPersisted(
            TenantMemberModel.create({
              tenantId: 1,
              userId: 11,
              userUUID: '019538a0-0000-7000-8000-000000000902',
              role: 'VIEWER',
            }),
            2,
          ),
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
