Resumen
Implementar Domain Events usando AggregateRoot de @nestjs/cqrs. Los modelos extenderán una clase que combina AggregateRoot de NestJS con las propiedades base (id, uuid, timestamps). Event handlers solo hacen log. Solo comandos, no queries.

Fase 1: Crear AggregateRoot que extienda CqrsAggregateRoot
Archivo nuevo: src/shared/domain/base/aggregate-root.ts
La clase AggregateRoot de @nestjs/cqrs provee:

apply(event) - Registra evento
commit() - Publica eventos pendientes
getUncommittedEvents() - Obtiene eventos no publicados

Creamos clase intermedia que combina esto con propiedades base:
typescriptimport { AggregateRoot as CqrsAggregateRoot, IEvent } from '@nestjs/cqrs';
import { UuidVO } from '@/shared/domain/value-objects/compound/uuid.vo';

export interface AggregateRootProps {
  id?: number;
  uuid?: string;
  createdAt?: Date;
  updatedAt?: Date;
  archivedAt?: Date | null;
}

export abstract class AggregateRoot<EventBase extends IEvent = IEvent> extends CqrsAggregateRoot<EventBase> {
  protected _id?: number;
  protected _uuid: UuidVO;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _archivedAt: Date | null;

  constructor(props?: AggregateRootProps) {
    super();
    this._id = props?.id;
    this._uuid = props?.uuid ? new UuidVO(props.uuid) : new UuidVO();
    this._createdAt = props?.createdAt ?? new Date();
    this._updatedAt = props?.updatedAt ?? new Date();
    this._archivedAt = props?.archivedAt ?? null;
  }

  get id(): number | undefined { return this._id; }
  get uuid(): string { return this._uuid.value; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get archivedAt(): Date | null { return this._archivedAt; }
  get isArchived(): boolean { return this._archivedAt !== null; }

  archive(): void { this._archivedAt = new Date(); this.touch(); }
  restore(): void { this._archivedAt = null; this.touch(); }
  protected touch(): void { this._updatedAt = new Date(); }
}
Actualizar: src/shared/domain/base/index.ts

Agregar export de AggregateRoot y AggregateRootProps


Fase 2: Crear Domain Events
User Bounded Context
Directorio: src/bounded-contexts/user/domain/events/
ArchivoEventoPropiedadesuser-created.event.tsUserCreatedEventuserUuid, email, usernameuser-created-from-social.event.tsUserCreatedFromSocialEventuserUuid, email, provideruser-password-updated.event.tsUserPasswordUpdatedEventuserUuidindex.tsBarrel exports-
Auth Bounded Context
Directorio: src/bounded-contexts/auth/domain/events/
ArchivoEventoPropiedadesuser-signed-up.event.tsUserSignedUpEventuserUuid, emailuser-signed-in.event.tsUserSignedInEventuserUuiduser-signed-out.event.tsUserSignedOutEventuserUuidsession-created.event.tsSessionCreatedEventsessionUuid, userIdsession-archived.event.tsSessionArchivedEventsessionUuidsession-refreshed.event.tsSessionRefreshedEventoldSessionUuid, newSessionUuidpassword-reset-requested.event.tsPasswordResetRequestedEventuserId, emailpassword-reset-completed.event.tsPasswordResetCompletedEventuserIdindex.tsBarrel exports-

Fase 3: Actualizar Modelos para Extender AggregateRoot
Archivos a modificar:

src/bounded-contexts/user/domain/models/user.model.ts

Cambiar extends BaseModel → extends AggregateRoot
En create(): usar this.apply(new UserCreatedEvent(...))
En updatePasswordHash(): usar this.apply(new UserPasswordUpdatedEvent(...))
reconstitute() NO aplica eventos (es para rehidratar desde BD)


src/bounded-contexts/auth/domain/models/session.model.ts

Cambiar extends BaseModel → extends AggregateRoot
En create(): usar this.apply(new SessionCreatedEvent(...))


src/bounded-contexts/auth/domain/models/password-reset-token.model.ts

Cambiar extends BaseModel → extends AggregateRoot
En create(): usar this.apply(new PasswordResetRequestedEvent(...))
En markAsUsed(): usar this.apply(new PasswordResetCompletedEvent(...))




Fase 4: Crear Event Handlers (Solo Logger)
User Bounded Context
Directorio: src/bounded-contexts/user/application/event-handlers/
typescript// Ejemplo: user-created.event-handler.ts
@EventsHandler(UserCreatedEvent)
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(UserCreatedEventHandler.name);

  handle(event: UserCreatedEvent): void {
    this.logger.log(`User created: uuid=${event.userUuid}, email=${event.email}`);
  }
}
Event Handlers a crear:

UserCreatedEventHandler
UserCreatedFromSocialEventHandler
UserPasswordUpdatedEventHandler

Auth Bounded Context
Directorio: src/bounded-contexts/auth/application/event-handlers/
Event Handlers a crear:

UserSignedUpEventHandler
UserSignedInEventHandler
UserSignedOutEventHandler
SessionCreatedEventHandler
SessionArchivedEventHandler
SessionRefreshedEventHandler
PasswordResetRequestedEventHandler
PasswordResetCompletedEventHandler


Fase 5: Modificar Command Handlers para Publicar Eventos
Usar EventPublisher de @nestjs/cqrs
El EventPublisher permite hacer merge del contexto de publicación con el aggregate:
typescriptimport { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserModel> {
    const user = UserModel.create({...});
    const persistedUser = await this.userContract.persist(user);

    // Merge context y commit para publicar eventos
    this.eventPublisher.mergeObjectContext(user);
    user.commit();

    return persistedUser;
  }
}
Command Handlers a modificar:
HandlerEventos a publicarCreateUserHandlerUserCreatedEventCreateUserFromSocialHandlerUserCreatedFromSocialEventSignUpHandlerUserSignedUpEvent, SessionCreatedEventSignInHandlerUserSignedInEvent, SessionCreatedEventSignOutHandlerUserSignedOutEvent, SessionArchivedEventRefreshSessionHandlerSessionRefreshedEvent, SessionCreatedEventSocialSignInHandlerUserSignedInEvent, SessionCreatedEventForgotPasswordHandlerPasswordResetRequestedEventResetPasswordHandlerPasswordResetCompletedEvent

Fase 6: Registrar Event Handlers en Módulos
src/bounded-contexts/user/infrastructure/user.module.ts
typescriptconst EventHandlers = [
  UserCreatedEventHandler,
  UserCreatedFromSocialEventHandler,
  UserPasswordUpdatedEventHandler,
];

@Module({
  providers: [...existingProviders, ...EventHandlers],
})
src/bounded-contexts/auth/infrastructure/auth.module.ts
typescriptconst EventHandlers = [
  UserSignedUpEventHandler,
  UserSignedInEventHandler,
  UserSignedOutEventHandler,
  SessionCreatedEventHandler,
  SessionArchivedEventHandler,
  SessionRefreshedEventHandler,
  PasswordResetRequestedEventHandler,
  PasswordResetCompletedEventHandler,
];

@Module({
  providers: [...existingProviders, ...EventHandlers],
})

Archivos Críticos
TipoRutaNuevosrc/shared/domain/base/aggregate-root.tsModificarsrc/shared/domain/base/index.tsNuevosrc/bounded-contexts/user/domain/events/*.ts (4 archivos)Nuevosrc/bounded-contexts/auth/domain/events/*.ts (9 archivos)Modificarsrc/bounded-contexts/user/domain/models/user.model.tsModificarsrc/bounded-contexts/auth/domain/models/session.model.tsModificarsrc/bounded-contexts/auth/domain/models/password-reset-token.model.tsNuevosrc/bounded-contexts/user/application/event-handlers/*.ts (4 archivos)Nuevosrc/bounded-contexts/auth/application/event-handlers/*.ts (9 archivos)Modificarsrc/bounded-contexts/user/infrastructure/user.module.tsModificarsrc/bounded-contexts/auth/infrastructure/auth.module.tsModificarTodos los command handlers (9 archivos)

Fase 7: Tests para Verificar Emisión de Eventos
Tests Unitarios para Command Handlers
Verificar que los eventos se emiten correctamente después de la persistencia.
Directorio: test/unit/bounded-contexts/user/application/
typescript// create-user.handler.spec.ts
describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let userContract: jest.Mocked<IUserContract>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CreateUserHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: { persist: jest.fn() } },
        { provide: EventPublisher, useValue: { mergeObjectContext: jest.fn() } },
      ],
    }).compile();

    handler = module.get(CreateUserHandler);
    userContract = module.get(INJECTION_TOKENS.USER_CONTRACT);
    eventPublisher = module.get(EventPublisher);
  });

  it('should emit UserCreatedEvent after persisting user', async () => {
    const command = new CreateUserCommand('test@test.com', 'testuser', 'hashedPassword');

    userContract.persist.mockImplementation(async (user) => user);
    eventPublisher.mergeObjectContext.mockImplementation((user) => user);

    const result = await handler.execute(command);

    expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(result);
    expect(result.getUncommittedEvents()).toHaveLength(0); // Ya se hizo commit
  });

  it('should apply UserCreatedEvent on model creation', () => {
    const user = UserModel.create({
      email: 'test@test.com',
      username: 'testuser',
      passwordHash: 'hash',
    });

    const events = user.getUncommittedEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserCreatedEvent);
    expect((events[0] as UserCreatedEvent).userUuid).toBe(user.uuid);
  });
});
Tests para Modelos (AggregateRoot)
Directorio: test/unit/bounded-contexts/user/domain/
typescript// user.model.spec.ts - Agregar tests de eventos
describe('UserModel Domain Events', () => {
  it('should emit UserCreatedEvent when created via create()', () => {
    const user = UserModel.create({
      email: 'test@test.com',
      username: 'testuser',
      passwordHash: 'hash123',
    });

    const events = user.getUncommittedEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserCreatedEvent);
  });

  it('should NOT emit events when reconstituted from database', () => {
    const user = UserModel.reconstitute({
      id: 1,
      uuid: 'some-uuid',
      email: 'test@test.com',
      username: 'testuser',
      passwordHash: 'hash123',
    });

    const events = user.getUncommittedEvents();

    expect(events).toHaveLength(0);
  });

  it('should emit UserPasswordUpdatedEvent when password is updated', () => {
    const user = UserModel.create({
      email: 'test@test.com',
      username: 'testuser',
      passwordHash: 'oldHash',
    });
    user.commit(); // Clear creation event

    user.updatePasswordHash('newHash');

    const events = user.getUncommittedEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserPasswordUpdatedEvent);
  });
});
Tests para Auth Models
typescript// session.model.spec.ts
describe('SessionModel Domain Events', () => {
  it('should emit SessionCreatedEvent when created', () => {
    const session = SessionModel.create({
      userId: 1,
      tokenHash: 'hash123',
      expiresAt: new Date(),
    });

    const events = session.getUncommittedEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(SessionCreatedEvent);
  });
});

// password-reset-token.model.spec.ts
describe('PasswordResetTokenModel Domain Events', () => {
  it('should emit PasswordResetRequestedEvent when created', () => {
    const token = PasswordResetTokenModel.create({
      userId: 1,
      tokenHash: 'hash123',
      expiresAt: new Date(),
    });

    expect(token.getUncommittedEvents()[0]).toBeInstanceOf(PasswordResetRequestedEvent);
  });

  it('should emit PasswordResetCompletedEvent when marked as used', () => {
    const token = PasswordResetTokenModel.create({...});
    token.commit();

    token.markAsUsed();

    expect(token.getUncommittedEvents()[0]).toBeInstanceOf(PasswordResetCompletedEvent);
  });
});
```

### Archivos de Test a Crear/Modificar

| Archivo | Descripción |
|---------|-------------|
| `test/unit/bounded-contexts/user/domain/user.model.spec.ts` | Agregar tests de eventos |
| `test/unit/bounded-contexts/auth/domain/session.model.spec.ts` | Nuevo - tests de SessionModel |
| `test/unit/bounded-contexts/auth/domain/password-reset-token.model.spec.ts` | Nuevo - tests de PasswordResetTokenModel |
| `test/unit/bounded-contexts/user/application/create-user.handler.spec.ts` | Nuevo - test de handler |
| `test/unit/bounded-contexts/auth/application/sign-up.handler.spec.ts` | Actualizar con tests de eventos |
| `test/unit/bounded-contexts/auth/application/sign-in.handler.spec.ts` | Actualizar con tests de eventos |

---

## Verificación

1. `npm run build` - Debe compilar sin errores
2. `npm run test` - Todos los tests deben pasar (incluyendo nuevos tests de eventos)
3. `npm run lint` - Sin errores de linting
4. Probar endpoint `POST /api/auth/sign-up` y verificar en consola:
```
   [UserCreatedEventHandler] User created: uuid=xxx, email=test@test.com
   [SessionCreatedEventHandler] Session created: sessionUuid=xxx, userId=1