import { Test, TestingModule } from '@nestjs/testing';
import { GetTenantMembersHandler } from '@tenant/application/queries/get-tenant-members/get-tenant-members.handler';
import { GetTenantMembersQuery } from '@tenant/application/queries/get-tenant-members/get-tenant-members.query';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

describe('GetTenantMembersHandler', () => {
  let handler: GetTenantMembersHandler;
  let memberContract: jest.Mocked<Pick<ITenantMemberContract, 'findAllByTenantId'>>;

  beforeEach(async () => {
    memberContract = {
      findAllByTenantId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTenantMembersHandler,
        { provide: INJECTION_TOKENS.TENANT_MEMBER_CONTRACT, useValue: memberContract },
      ],
    }).compile();

    handler = module.get<GetTenantMembersHandler>(GetTenantMembersHandler);
  });

  describe('Given a tenant with members', () => {
    beforeEach(() => {
      memberContract.findAllByTenantId.mockResolvedValue([
        TenantMemberModel.create({
          tenantId: 1,
          userId: 42,
          userUUID: '550e8400-e29b-41d4-a716-446655440000',
          role: 'OWNER',
        }),
      ]);
    });

    describe('When the handler executes', () => {
      it('Then it returns ok with the members list', async () => {
        const result = await handler.execute(new GetTenantMembersQuery(1));
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toHaveLength(1);
        expect(result._unsafeUnwrap()[0].isOwner()).toBe(true);
      });
    });
  });

  describe('Given a tenant with no members', () => {
    beforeEach(() => {
      memberContract.findAllByTenantId.mockResolvedValue([]);
    });

    describe('When the handler executes', () => {
      it('Then it returns ok with an empty array', async () => {
        const result = await handler.execute(new GetTenantMembersQuery(1));
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toHaveLength(0);
      });
    });
  });
});
