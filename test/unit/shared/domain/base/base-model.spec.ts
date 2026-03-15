import { BaseModel } from '@shared/domain/base/base.model';
import { AggregateRoot } from '@shared/domain/base/aggregate-root';
import { DomainEvent } from '@shared/domain/base/domain-event';

// ─── Concrete implementation for testing BaseModel ────────────────────────────
class ConcreteBaseModel extends BaseModel {
  constructor(props?: ConstructorParameters<typeof BaseModel>[0]) {
    super(props);
  }

  callTouch(): void {
    this.touch();
  }
}

// ─── Concrete implementation for testing AggregateRoot ───────────────────────
class ConcreteAggregateRoot extends AggregateRoot {
  constructor(props?: ConstructorParameters<typeof AggregateRoot>[0]) {
    super(props);
  }
}

// ─── Concrete implementation for testing DomainEvent ─────────────────────────
class ConcreteDomainEvent extends DomainEvent {
  get eventName(): string {
    return 'concrete.event';
  }
}

// ─── BaseModel ────────────────────────────────────────────────────────────────
describe('BaseModel', () => {
  describe('Given no props', () => {
    describe('When instantiated', () => {
      it('Then it auto-generates a UUID and defaults timestamps', () => {
        const model = new ConcreteBaseModel();
        expect(model.uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
        expect(model.id).toBeUndefined();
        expect(model.createdAt).toBeInstanceOf(Date);
        expect(model.updatedAt).toBeInstanceOf(Date);
        expect(model.archivedAt).toBeNull();
      });
    });
  });

  describe('Given explicit props', () => {
    describe('When instantiated', () => {
      it('Then it stores all provided props', () => {
        const createdAt = new Date('2024-01-01');
        const updatedAt = new Date('2024-06-01');
        const model = new ConcreteBaseModel({
          id: 42,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          createdAt,
          updatedAt,
          archivedAt: null,
        });
        expect(model.id).toBe(42);
        expect(model.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(model.createdAt).toEqual(createdAt);
        expect(model.updatedAt).toEqual(updatedAt);
        expect(model.archivedAt).toBeNull();
      });
    });
  });

  describe('Given an active model', () => {
    describe('When isArchived() is called', () => {
      it('Then it returns false', () => {
        const model = new ConcreteBaseModel({ archivedAt: null });
        expect(model.isArchived()).toBe(false);
      });
    });
  });

  describe('Given an active model', () => {
    describe('When archive() is called', () => {
      it('Then isArchived returns true and archivedAt is set', () => {
        const model = new ConcreteBaseModel();
        expect(model.isArchived()).toBe(false);
        model.archive();
        expect(model.isArchived()).toBe(true);
        expect(model.archivedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Given an archived model', () => {
    describe('When restore() is called', () => {
      it('Then isArchived returns false and archivedAt is null', () => {
        const model = new ConcreteBaseModel({ archivedAt: new Date() });
        expect(model.isArchived()).toBe(true);
        model.restore();
        expect(model.isArchived()).toBe(false);
        expect(model.archivedAt).toBeNull();
      });
    });
  });

  describe('Given a model', () => {
    describe('When touch() is called via subclass', () => {
      it('Then updatedAt is refreshed', () => {
        const model = new ConcreteBaseModel({
          updatedAt: new Date('2020-01-01'),
        });
        const before = model.updatedAt.getTime();
        model.callTouch();
        expect(model.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      });
    });
  });
});

// ─── AggregateRoot ────────────────────────────────────────────────────────────
describe('AggregateRoot', () => {
  describe('Given no props', () => {
    describe('When instantiated', () => {
      it('Then it auto-generates a UUID and provides domain event methods', () => {
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
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          createdAt,
          updatedAt,
          archivedAt: null,
        });
        expect(aggregate.id).toBe(5);
        expect(aggregate.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
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

// ─── DomainEvent ──────────────────────────────────────────────────────────────
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
