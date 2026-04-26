import { BaseModel } from '@shared/domain/base/base.model';
import { AggregateRoot } from '@shared/domain/base/aggregate-root';
import { DomainEvent } from '@shared/domain/base/domain-event';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';

// ─── Concrete subclass for testing the BaseModel abstract contract ──────────
class ConcreteBaseModel extends BaseModel {
  constructor(
    public readonly id: number | undefined,
    public readonly uuid: UUIDVO,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly archivedAt: Date | null,
  ) {
    super();
  }
}

class ConcreteAggregateRoot extends AggregateRoot {
  constructor(props?: ConstructorParameters<typeof AggregateRoot>[0]) {
    super(props);
  }
}

class ConcreteDomainEvent extends DomainEvent {
  get eventName(): string {
    return 'concrete.event';
  }
}

const STABLE_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('BaseModel', () => {
  describe('Given a Pure Model with full props', () => {
    describe('When instantiated', () => {
      it('Then it exposes id, uuid (VO), and timestamps verbatim', () => {
        const createdAt = new Date('2024-01-01');
        const updatedAt = new Date('2024-06-01');
        const model = new ConcreteBaseModel(
          42,
          new UUIDVO(STABLE_UUID),
          createdAt,
          updatedAt,
          null,
        );

        expect(model.id).toBe(42);
        expect(model.uuid.toString()).toBe(STABLE_UUID);
        expect(model.createdAt).toEqual(createdAt);
        expect(model.updatedAt).toEqual(updatedAt);
        expect(model.archivedAt).toBeNull();
      });
    });
  });

  describe('Given a non-archived model', () => {
    describe('When isArchived() is queried', () => {
      it('Then it returns false', () => {
        const model = new ConcreteBaseModel(undefined, new UUIDVO(), new Date(), new Date(), null);
        expect(model.isArchived()).toBe(false);
      });
    });
  });

  describe('Given an archived model', () => {
    describe('When isArchived() is queried', () => {
      it('Then it returns true', () => {
        const model = new ConcreteBaseModel(
          undefined,
          new UUIDVO(),
          new Date(),
          new Date(),
          new Date(),
        );
        expect(model.isArchived()).toBe(true);
      });
    });
  });
});

describe('AggregateRoot', () => {
  describe('Given no props', () => {
    describe('When instantiated', () => {
      it('Then it auto-generates a UUID and exposes the CQRS event surface', () => {
        const aggregate = new ConcreteAggregateRoot();
        expect(aggregate.uuid).toBeDefined();
        expect(aggregate.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });

  describe('Given explicit props', () => {
    describe('When instantiated', () => {
      it('Then it stores id, uuid, and timestamps', () => {
        const createdAt = new Date('2024-01-01');
        const updatedAt = new Date('2024-06-01');
        const aggregate = new ConcreteAggregateRoot({
          id: 5,
          uuid: STABLE_UUID,
          createdAt,
          updatedAt,
          archivedAt: null,
        });
        expect(aggregate.id).toBe(5);
        expect(aggregate.uuid.toString()).toBe(STABLE_UUID);
        expect(aggregate.createdAt).toEqual(createdAt);
        expect(aggregate.updatedAt).toEqual(updatedAt);
      });
    });
  });

  describe('Given an active aggregate', () => {
    describe('When archive() is called', () => {
      it('Then isArchived returns true', () => {
        const aggregate = new ConcreteAggregateRoot();
        aggregate.archive();
        expect(aggregate.isArchived()).toBe(true);
        expect(aggregate.archivedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Given an archived aggregate', () => {
    describe('When restore() is called', () => {
      it('Then isArchived returns false', () => {
        const aggregate = new ConcreteAggregateRoot({ archivedAt: new Date() });
        expect(aggregate.isArchived()).toBe(true);
        aggregate.restore();
        expect(aggregate.isArchived()).toBe(false);
        expect(aggregate.archivedAt).toBeNull();
      });
    });
  });
});

describe('DomainEvent', () => {
  describe('Given a concrete DomainEvent subclass', () => {
    describe('When instantiated', () => {
      it('Then occurredOn is set to current time and eventName is accessible', () => {
        const before = Date.now();
        const event = new ConcreteDomainEvent();
        const after = Date.now();

        expect(event.occurredOn).toBeInstanceOf(Date);
        expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before);
        expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after);
        expect(event.eventName).toBe('concrete.event');
      });
    });
  });
});
