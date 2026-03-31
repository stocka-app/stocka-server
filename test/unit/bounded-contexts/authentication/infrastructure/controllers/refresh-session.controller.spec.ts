import { CommandBus } from '@nestjs/cqrs';
import { UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { RefreshSessionController } from '@authentication/infrastructure/controllers/refresh-session/refresh-session.controller';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ok, err } from 'neverthrow';

// ─── Helpers ─────────────────────────────────────────────────────────────────

class TestDomainException extends DomainException {
  constructor() {
    super('TOKEN_EXPIRED', 'token expired');
  }
}

function buildRequest(cookies: Record<string, string> | null = {}): Request {
  return {
    cookies: cookies,
  } as unknown as Request;
}

function buildResponse(): jest.Mocked<Response> {
  return {
    cookie: jest.fn(),
  } as unknown as jest.Mocked<Response>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RefreshSessionController', () => {
  let controller: RefreshSessionController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(() => {
    commandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>;

    controller = new RefreshSessionController(commandBus);
  });

  describe('Given the request has no refresh_token cookie', () => {
    describe('When handle is called', () => {
      it('Then it throws UnauthorizedException', async () => {
        const req = buildRequest({});
        const res = buildResponse();

        await expect(controller.handle(req, res)).rejects.toThrow(UnauthorizedException);
        await expect(controller.handle(req, res)).rejects.toThrow('Refresh token missing');
      });
    });
  });

  describe('Given the request has no cookies at all', () => {
    describe('When handle is called', () => {
      it('Then it throws UnauthorizedException', async () => {
        const req = buildRequest(null);
        const res = buildResponse();

        await expect(controller.handle(req, res)).rejects.toThrow(UnauthorizedException);
      });
    });
  });

  describe('Given a valid refresh_token cookie', () => {
    describe('When the command fails with a DomainException', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(err(new TestDomainException()));
      });

      it('Then it throws an HTTP exception', async () => {
        const req = buildRequest({ refresh_token: 'valid-token' });
        const res = buildResponse();

        await expect(controller.handle(req, res)).rejects.toBeDefined();
      });
    });

    describe('When the command succeeds', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(
          ok({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            username: 'testuser',
            givenName: 'Test',
            familyName: 'User',
            avatarUrl: null,
            onboardingStatus: null,
          }),
        );
      });

      it('Then it returns the new access token', async () => {
        const req = buildRequest({ refresh_token: 'old-refresh-token' });
        const res = buildResponse();

        const result = await controller.handle(req, res);

        expect(result.accessToken).toBe('new-access-token');
      });
    });
  });
});
