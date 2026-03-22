import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RecordUserConsentsController } from '@user/infrastructure/http/controllers/record-user-consents/record-user-consents.controller';
import { GetUserConsentsController } from '@user/infrastructure/http/controllers/get-user-consents/get-user-consents.controller';
import {
  RecordUserConsentsCommand,
  RecordUserConsentsPayload,
} from '@user/application/commands/record-user-consents/record-user-consents.command';
import { GetUserConsentsQuery } from '@user/application/queries/get-user-consents/get-user-consents.query';
import { ok, err } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { RecordUserConsentsInDto } from '@user/infrastructure/http/controllers/record-user-consents/record-user-consents-in.dto';
import { Request } from 'express';

class TestDomainException extends DomainException {
  constructor() {
    super('test error', 'TEST_ERROR', []);
  }
}

describe('RecordUserConsentsController', () => {
  let controller: RecordUserConsentsController;
  let commandBus: { execute: jest.Mock };

  const USER = { uuid: '550e8400-e29b-41d4-a716-446655440000' };
  const DTO: RecordUserConsentsInDto = {
    terms: true,
    marketing: false,
    analytics: true,
  };

  const mockRequest = {
    ip: '192.168.1.1',
    headers: { 'user-agent': 'TestAgent/1.0' },
  } as unknown as Request;

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordUserConsentsController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();

    controller = module.get<RecordUserConsentsController>(RecordUserConsentsController);
  });

  describe('Given valid consent data', () => {
    describe('When the command succeeds', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(ok(undefined));
      });

      it('Then it returns { recorded: true }', async () => {
        const result = await controller.handle(DTO, USER as any, mockRequest);

        expect(result).toEqual({ recorded: true });
      });

      it('Then the command bus is called with the correct command', async () => {
        await controller.handle(DTO, USER as any, mockRequest);

        expect(commandBus.execute).toHaveBeenCalledTimes(1);
        const command = commandBus.execute.mock.calls[0][0] as RecordUserConsentsCommand;
        expect(command.userUUID).toBe(USER.uuid);
        expect(command.consents).toEqual({
          terms: true,
          marketing: false,
          analytics: true,
        });
        expect(command.ipAddress).toBe('192.168.1.1');
        expect(command.userAgent).toBe('TestAgent/1.0');
      });
    });

    describe('When the command fails', () => {
      it('Then it throws the domain exception', async () => {
        commandBus.execute.mockResolvedValue(err(new TestDomainException()));

        await expect(
          controller.handle(DTO, USER as any, mockRequest),
        ).rejects.toThrow(TestDomainException);
      });
    });

    describe('When request.ip is undefined', () => {
      it('Then ipAddress is null in the command', async () => {
        commandBus.execute.mockResolvedValue(ok(undefined));

        const noIpRequest = {
          ip: undefined,
          headers: { 'user-agent': 'TestAgent/1.0' },
        } as unknown as Request;

        await controller.handle(DTO, USER as any, noIpRequest);

        const command = commandBus.execute.mock.calls[0][0] as RecordUserConsentsCommand;
        expect(command.ipAddress).toBeNull();
      });
    });

    describe('When user-agent header is missing', () => {
      it('Then userAgent is null in the command', async () => {
        commandBus.execute.mockResolvedValue(ok(undefined));

        const noUaRequest = {
          ip: '10.0.0.1',
          headers: {},
        } as unknown as Request;

        await controller.handle(DTO, USER as any, noUaRequest);

        const command = commandBus.execute.mock.calls[0][0] as RecordUserConsentsCommand;
        expect(command.userAgent).toBeNull();
      });
    });
  });
});

describe('GetUserConsentsController', () => {
  let controller: GetUserConsentsController;
  let queryBus: { execute: jest.Mock };

  const USER_UUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetUserConsentsController],
      providers: [{ provide: QueryBus, useValue: queryBus }],
    }).compile();

    controller = module.get<GetUserConsentsController>(GetUserConsentsController);
  });

  describe('Given the user has consents', () => {
    const CONSENTS = [
      {
        consentType: 'terms_of_service',
        granted: true,
        documentVersion: 'v1.0',
        grantedAt: '2026-03-21T10:00:00.000Z',
      },
    ];

    beforeEach(() => {
      queryBus.execute.mockResolvedValue(CONSENTS);
    });

    describe('When getting user consents', () => {
      it('Then it returns the consents wrapped in an object', async () => {
        const result = await controller.handle(USER_UUID);

        expect(result).toEqual({ consents: CONSENTS });
      });

      it('Then the query bus is called with the correct query', async () => {
        await controller.handle(USER_UUID);

        expect(queryBus.execute).toHaveBeenCalledTimes(1);
        const query = queryBus.execute.mock.calls[0][0] as GetUserConsentsQuery;
        expect(query.userUUID).toBe(USER_UUID);
      });
    });
  });

  describe('Given the user has no consents', () => {
    beforeEach(() => {
      queryBus.execute.mockResolvedValue([]);
    });

    describe('When getting user consents', () => {
      it('Then it returns an empty consents array', async () => {
        const result = await controller.handle(USER_UUID);

        expect(result).toEqual({ consents: [] });
      });
    });
  });
});
