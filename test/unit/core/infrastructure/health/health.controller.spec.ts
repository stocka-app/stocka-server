import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from '@core/infrastructure/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: jest.Mocked<DataSource>;

  const createMockResponse = () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res as unknown as import('express').Response;
  };

  beforeEach(async () => {
    const mockDataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: mockDataSource }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    dataSource = module.get(DataSource);
  });

  describe('GET /api/health', () => {
    describe('Given the database is connected and responding', () => {
      it('When the health endpoint is called, Then it returns status ok with db connected', async () => {
        dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
        const res = createMockResponse();

        await controller.check(res);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
        expect(res.json).toHaveBeenCalledWith({
          status: 'ok',
          db: 'connected',
        });
      });
    });

    describe('Given the database is unreachable', () => {
      it('When the health endpoint is called, Then it returns status error with db disconnected and 503', async () => {
        dataSource.query.mockRejectedValue(new Error('Connection refused'));
        const res = createMockResponse();

        await controller.check(res);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
        expect(res.json).toHaveBeenCalledWith({
          status: 'error',
          db: 'disconnected',
        });
      });
    });

    describe('Given the database query times out', () => {
      it('When the health endpoint is called, Then it returns status error with db disconnected', async () => {
        dataSource.query.mockRejectedValue(new Error('Query timeout'));
        const res = createMockResponse();

        await controller.check(res);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
        expect(res.json).toHaveBeenCalledWith({
          status: 'error',
          db: 'disconnected',
        });
      });
    });
  });
});
