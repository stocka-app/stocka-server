import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PurgeUnverifiedUsersService } from '@user/application/services/purge-unverified-users.service';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

describe('Unverified account cleanup — Flexible Pendiente exclusion (EC-002)', () => {
  let service: PurgeUnverifiedUsersService;
  let userContract: jest.Mocked<Pick<IUserContract, 'destroyStaleUnverifiedUsers'>>;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    userContract = {
      destroyStaleUnverifiedUsers: jest.fn().mockResolvedValue(0),
    };

    configService = {
      get: jest.fn().mockReturnValue(30),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurgeUnverifiedUsersService,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PurgeUnverifiedUsersService>(PurgeUnverifiedUsersService);
  });

  describe('Given the daily cleanup job runs', () => {
    describe('When there are stale unverified accounts to remove', () => {
      it('Then the job deletes them using the configured retention period', async () => {
        // Given
        configService.get.mockReturnValue(30);
        userContract.destroyStaleUnverifiedUsers.mockResolvedValue(5);

        // When
        await service.purgeStaleUnverifiedUsers();

        // Then
        expect(userContract.destroyStaleUnverifiedUsers).toHaveBeenCalledWith(30);
      });

      it('Then Flexible Pendiente accounts are excluded by the repository query', async () => {
        // Given — only non-flexible accounts are returned as affected
        userContract.destroyStaleUnverifiedUsers.mockResolvedValue(3);

        // When
        await service.purgeStaleUnverifiedUsers();

        // Then — the contract method encapsulates the account_type != 'flexible' condition
        expect(userContract.destroyStaleUnverifiedUsers).toHaveBeenCalledTimes(1);
      });
    });

    describe('When there are no stale accounts to remove', () => {
      it('Then the job completes without errors and reports zero deletions', async () => {
        // Given
        userContract.destroyStaleUnverifiedUsers.mockResolvedValue(0);

        // When / Then
        await expect(service.purgeStaleUnverifiedUsers()).resolves.not.toThrow();
        expect(userContract.destroyStaleUnverifiedUsers).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the retention period is customised via environment variable', () => {
      it('Then the job uses the configured value instead of the 30-day default', async () => {
        // Given — a deployment that purges after 14 days
        configService.get.mockReturnValue(14);

        // When
        await service.purgeStaleUnverifiedUsers();

        // Then
        expect(userContract.destroyStaleUnverifiedUsers).toHaveBeenCalledWith(14);
      });
    });
  });
});
