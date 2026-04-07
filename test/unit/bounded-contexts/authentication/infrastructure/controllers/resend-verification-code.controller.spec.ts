import { CommandBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { ResendVerificationCodeController } from '@authentication/infrastructure/controllers/resend-verification-code/resend-verification-code.controller';
import { ResendVerificationCodeInDto } from '@authentication/infrastructure/controllers/resend-verification-code/resend-verification-code-in.dto';
import { ok, err } from 'neverthrow';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildRequest(
  overrides: {
    forwardedFor?: string | string[];
    ip?: string;
    remoteAddress?: string;
    acceptLanguage?: string;
  } = {},
): Request {
  return {
    headers: {
      'x-forwarded-for': overrides.forwardedFor,
      'accept-language': overrides.acceptLanguage ?? 'en',
    },
    ip: overrides.ip ?? '127.0.0.1',
    socket: { remoteAddress: overrides.remoteAddress },
  } as unknown as Request;
}

function buildDto(email = 'test@example.com'): ResendVerificationCodeInDto {
  return { email } as ResendVerificationCodeInDto;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ResendVerificationCodeController', () => {
  let controller: ResendVerificationCodeController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(() => {
    commandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>;

    controller = new ResendVerificationCodeController(commandBus);
  });

  describe('Given the request comes from a direct IP (no x-forwarded-for)', () => {
    describe('When the command succeeds', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(
          ok({ success: true, message: 'sent', cooldownSeconds: 0, remainingResends: 2 }),
        );
      });

      it('Then it uses req.ip as the client IP', async () => {
        const req = buildRequest({ ip: '192.168.1.1' });
        const result = await controller.handle(buildDto(), req);

        expect(result.success).toBe(true);
        const command = (commandBus.execute as jest.Mock).mock.calls[0][0] as { ipAddress: string };
        expect(command.ipAddress).toBe('192.168.1.1');
      });
    });
  });

  describe('Given the request comes through a proxy with x-forwarded-for header', () => {
    describe('When x-forwarded-for is a single string with multiple IPs', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(
          ok({ success: true, message: 'sent', cooldownSeconds: 0, remainingResends: 2 }),
        );
      });

      it('Then it uses the first IP from x-forwarded-for', async () => {
        const req = buildRequest({ forwardedFor: '10.0.0.1, 10.0.0.2' });
        await controller.handle(buildDto(), req);

        const command = (commandBus.execute as jest.Mock).mock.calls[0][0] as { ipAddress: string };
        expect(command.ipAddress).toBe('10.0.0.1');
      });
    });

    describe('When x-forwarded-for is an array of strings', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(
          ok({ success: true, message: 'sent', cooldownSeconds: 0, remainingResends: 2 }),
        );
      });

      it('Then it uses the first element of the array', async () => {
        const req = buildRequest({ forwardedFor: ['10.0.0.5', '10.0.0.6'] });
        await controller.handle(buildDto(), req);

        const command = (commandBus.execute as jest.Mock).mock.calls[0][0] as { ipAddress: string };
        expect(command.ipAddress).toBe('10.0.0.5');
      });
    });
  });

  describe('Given the request has no ip and no socket remoteAddress', () => {
    describe('When the command succeeds', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(
          ok({ success: true, message: 'sent', cooldownSeconds: 0, remainingResends: 2 }),
        );
      });

      it('Then it falls back to 0.0.0.0', async () => {
        const req = {
          headers: { 'accept-language': 'en' },
          ip: undefined,
          socket: { remoteAddress: undefined },
        } as unknown as Request;

        await controller.handle(buildDto(), req);

        const command = (commandBus.execute as jest.Mock).mock.calls[0][0] as { ipAddress: string };
        expect(command.ipAddress).toBe('0.0.0.0');
      });
    });
  });

  describe('Given the socket has a remoteAddress but req.ip is undefined', () => {
    describe('When the command succeeds', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(
          ok({ success: true, message: 'sent', cooldownSeconds: 0, remainingResends: 2 }),
        );
      });

      it('Then it uses socket.remoteAddress', async () => {
        const req = buildRequest({ ip: undefined, remoteAddress: '172.16.0.1' });
        // Override ip to be undefined
        (req as unknown as { ip: undefined }).ip = undefined;
        await controller.handle(buildDto(), req);

        const command = (commandBus.execute as jest.Mock).mock.calls[0][0] as { ipAddress: string };
        expect(command.ipAddress).toBe('172.16.0.1');
      });
    });
  });

  describe('Given the command fails with a DomainException', () => {
    class TestDomainException extends DomainException {
      constructor() {
        super('TEST_ERROR', 'test error');
      }
    }

    beforeEach(() => {
      commandBus.execute.mockResolvedValue(err(new TestDomainException()));
    });

    it('Then it throws an HTTP exception', async () => {
      const req = buildRequest();
      await expect(controller.handle(buildDto(), req)).rejects.toBeDefined();
    });
  });
});
