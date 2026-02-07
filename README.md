# Stocka Server

Backend API para el sistema de gestión de inventario Stocka.

## Tecnologías

- **NestJS 11** - Framework de Node.js
- **TypeScript 5.7** - Tipado estático
- **PostgreSQL 15** - Base de datos
- **TypeORM** - ORM
- **JWT** - Autenticación
- **Passport** - Estrategias de autenticación (JWT, Google, Facebook, Apple)

## Arquitectura

El proyecto sigue los principios de:
- **Clean Architecture** - Separación de capas
- **DDD (Domain-Driven Design)** - Bounded Contexts
- **CQRS** - Separación de comandos y consultas

### Estructura de carpetas

```
src/
├── bounded-contexts/     # Contextos de dominio
│   ├── auth/            # Autenticación y sesiones
│   └── user/            # Gestión de usuarios
├── common/              # Utilidades compartidas (filters, pipes, decorators)
├── core/                # Configuración central (database, swagger)
└── shared/              # Dominio compartido (value objects, exceptions, base classes)
```

## Requisitos previos

- Node.js 20+
- npm 10+
- Docker y Docker Compose (para la base de datos)

## Instalación

```bash
npm install
```

## Configuración

Copia el archivo `.env.example` a `.env` y configura las variables de entorno:

```bash
cp .env.example .env
```

Variables requeridas:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- Credenciales OAuth (Google, Facebook, Apple) si se usan

## Docker

### Estructura de archivos Docker

```
docker/
├── Dockerfile           # Dockerfile de producción (multi-stage)
├── Dockerfile.dev       # Dockerfile de desarrollo
├── docker-compose.yml   # Compose de producción (API + PostgreSQL)
└── docker-compose.dev.yml  # Compose de desarrollo (solo PostgreSQL)
```

### Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run docker:db` | Inicia solo PostgreSQL (desarrollo local) |
| `npm run docker:dev` | Inicia el entorno de desarrollo completo |
| `npm run docker:dev:build` | Reconstruye y levanta el entorno de desarrollo |
| `npm run docker:dev:down` | Detiene el entorno de desarrollo |
| `npm run docker:prod` | Inicia el entorno de producción (detached) |
| `npm run docker:prod:build` | Reconstruye y levanta producción |
| `npm run docker:prod:down` | Detiene el entorno de producción |
| `npm run docker:logs` | Muestra los logs de los contenedores |

### Uso típico

```bash
# Para desarrollo local (solo base de datos):
npm run docker:db

# En otra terminal, ejecutar la aplicación:
npm run start:dev

# Para desarrollo con todo en contenedores:
npm run docker:dev

# Para producción:
npm run docker:prod:build
```

## Ejecución

```bash
# Desarrollo (con hot-reload)
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## Migraciones

```bash
# Generar una nueva migración
npm run migration:generate -- src/migrations/NombreMigracion

# Ejecutar migraciones pendientes
npm run migration:run

# Revertir última migración
npm run migration:revert
```

## Tests

```bash
# Ejecutar todos los tests
npm run test

# Tests en modo watch
npm run test:watch

# Tests con cobertura
npm run test:cov

# Solo tests unitarios
npm run test:unit

# Tests e2e
npm run test:e2e
```

## API Documentation

Una vez ejecutando el servidor, la documentación Swagger está disponible en:

```
http://localhost:3001/api/docs
```

## Endpoints principales

### Auth
- `POST /auth/sign-up` - Registro de usuario
- `POST /auth/sign-in` - Inicio de sesión
- `POST /auth/sign-out` - Cerrar sesión
- `POST /auth/refresh` - Refrescar tokens
- `POST /auth/forgot-password` - Solicitar reset de contraseña
- `POST /auth/reset-password` - Resetear contraseña
- `GET /auth/google` - OAuth con Google
- `GET /auth/facebook` - OAuth con Facebook
- `GET /auth/apple` - OAuth con Apple

### User
- `GET /users/me` - Obtener usuario actual

## Licencia

Privado - Todos los derechos reservados.
