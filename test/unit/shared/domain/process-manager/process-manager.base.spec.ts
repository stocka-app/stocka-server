import { Logger } from '@nestjs/common';
import { ProcessManager } from '@shared/domain/process-manager/process-manager.base';
import { IProcessStateContract } from '@shared/domain/process-manager/process-state.contract';
import { ProcessState, ProcessStatus } from '@shared/domain/process-manager/process-state';

// Concrete test implementation
interface TestData {
  orderId: string;
  amount: number;
}

class TestProcessManager extends ProcessManager<TestData> {
  protected readonly processName = 'test-process';
  protected readonly logger = new Logger(TestProcessManager.name);

  // Expose protected methods for testing
  async testInitiate(
    correlationId: string,
    initialStep: string,
    data: TestData,
  ): Promise<ProcessState<TestData>> {
    return this.initiate(correlationId, initialStep, data);
  }

  async testTransition(
    state: ProcessState<TestData>,
    nextStep: string,
    status?: ProcessStatus,
    dataUpdate?: Partial<TestData>,
  ): Promise<ProcessState<TestData>> {
    return this.transition(state, nextStep, status, dataUpdate);
  }

  async testComplete(state: ProcessState<TestData>): Promise<ProcessState<TestData>> {
    return this.complete(state);
  }

  async testFail(
    state: ProcessState<TestData>,
    errorMessage: string,
  ): Promise<ProcessState<TestData>> {
    return this.fail(state, errorMessage);
  }

  async testCompensate(
    state: ProcessState<TestData>,
    errorMessage: string,
  ): Promise<ProcessState<TestData>> {
    return this.compensate(state, errorMessage);
  }
}

describe('ProcessManager', () => {
  let processManager: TestProcessManager;
  let stateRepository: jest.Mocked<IProcessStateContract>;

  beforeEach(() => {
    stateRepository = {
      findById: jest.fn(),
      findByCorrelationId: jest.fn(),
      persist: jest.fn().mockImplementation((state) => Promise.resolve({ ...state })),
      delete: jest.fn(),
    };

    processManager = new TestProcessManager(stateRepository);
  });

  describe('Given a new process', () => {
    it('should initiate with STARTED status and initial step', async () => {
      const data: TestData = { orderId: 'ORD-001', amount: 100 };

      const state = await processManager.testInitiate('corr-123', 'validate', data);

      expect(state.processName).toBe('test-process');
      expect(state.correlationId).toBe('corr-123');
      expect(state.status).toBe(ProcessStatus.STARTED);
      expect(state.currentStep).toBe('validate');
      expect(state.data).toEqual(data);
      expect(state.startedAt).toBeInstanceOf(Date);
      expect(state.id).toBeDefined();
      expect(stateRepository.persist).toHaveBeenCalledTimes(1);
    });
  });

  describe('Given a started process', () => {
    let initialState: ProcessState<TestData>;

    beforeEach(async () => {
      initialState = await processManager.testInitiate('corr-123', 'validate', {
        orderId: 'ORD-001',
        amount: 100,
      });
    });

    it('should transition to the next step with PROCESSING status', async () => {
      const nextState = await processManager.testTransition(initialState, 'charge');

      expect(nextState.currentStep).toBe('charge');
      expect(nextState.status).toBe(ProcessStatus.PROCESSING);
      expect(nextState.data).toEqual(initialState.data);
    });

    it('should transition with a data update', async () => {
      const nextState = await processManager.testTransition(
        initialState,
        'charge',
        ProcessStatus.PROCESSING,
        { amount: 200 },
      );

      expect(nextState.data.amount).toBe(200);
      expect(nextState.data.orderId).toBe('ORD-001');
    });

    it('should complete the process', async () => {
      const completedState = await processManager.testComplete(initialState);

      expect(completedState.status).toBe(ProcessStatus.COMPLETED);
      expect(completedState.completedAt).toBeInstanceOf(Date);
    });

    it('should fail the process with an error message', async () => {
      const failedState = await processManager.testFail(initialState, 'Payment declined');

      expect(failedState.status).toBe(ProcessStatus.FAILED);
      expect(failedState.errorMessage).toBe('Payment declined');
    });

    it('should enter compensation with an error message', async () => {
      const compensatingState = await processManager.testCompensate(
        initialState,
        'Timeout, rolling back',
      );

      expect(compensatingState.status).toBe(ProcessStatus.COMPENSATING);
      expect(compensatingState.errorMessage).toBe('Timeout, rolling back');
    });
  });

  describe('Given a correlation ID', () => {
    it('should find a process by correlation ID', async () => {
      const mockState: ProcessState<TestData> = {
        id: 'uuid-1',
        processName: 'test-process',
        correlationId: 'corr-456',
        status: ProcessStatus.PROCESSING,
        currentStep: 'charge',
        data: { orderId: 'ORD-002', amount: 50 },
        startedAt: new Date(),
        updatedAt: new Date(),
      };

      stateRepository.findByCorrelationId.mockResolvedValue(mockState as unknown as ProcessState);

      const result = await processManager.findByCorrelationId('corr-456');

      expect(result).toEqual(mockState);
      expect(stateRepository.findByCorrelationId).toHaveBeenCalledWith('corr-456');
    });

    it('should return null when no process is found', async () => {
      stateRepository.findByCorrelationId.mockResolvedValue(null);

      const result = await processManager.findByCorrelationId('nonexistent');

      expect(result).toBeNull();
    });
  });
});
