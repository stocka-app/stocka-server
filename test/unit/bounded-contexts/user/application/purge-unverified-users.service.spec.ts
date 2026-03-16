import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PurgeUnverifiedUsersService } from '@user/application/services/purge-unverified-users.service';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

describe('PurgeUnverifiedUsersService', () => {
  let service: PurgeUnverifiedUsersService;
  let userContract: jest.Mocked<Pick<IUserContract, 'persist' | 'findByUUID'>>;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    userContract = {
      persist: jest.fn(),
      findByUUID: jest.fn(),
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
    describe('When there are no stale accounts to remove', () => {
      it('Then the job completes without errors', async () => {
        await expect(service.purgeStaleUnverifiedUsers()).resolves.not.toThrow();
      });
    });

    describe('When the retention period is configured', () => {
      it('Then the job reads the configured retention period from ConfigService', async () => {
        configService.get.mockReturnValue(14);

        await service.purgeStaleUnverifiedUsers();

        expect(configService.get).toHaveBeenCalledWith('UNVERIFIED_USER_PURGE_DAYS', 30);
      });
    });
  });
});
