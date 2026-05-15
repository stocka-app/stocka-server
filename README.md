<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeORM-Latest-FE0803?style=for-the-badge&logo=typeorm&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

# Stocka Server

Backend API for the Stocka inventory management system — a multi-tenant platform designed for small businesses in Mexico.

---

## Features

- **Authentication & Authorization** — JWT access/refresh tokens, OAuth (Google, Facebook, Apple)
- **Multi-Tenant Architecture** — Schema-per-bounded-context isolation with PostgreSQL
- **Domain-Driven Design** — Bounded Contexts with rich domain models
- **CQRS Pattern** — Strict separation of commands (writes) and queries (reads)
- **Clean Architecture** — Domain → Application → Infrastructure dependency rule
- **API Documentation** — Auto-generated Swagger/OpenAPI docs
- **Docker Support** — Development and production Docker Compose setups

---

## Architecture

```
src/
├── bounded-contexts/        # Domain Bounded Contexts
│   ├── auth/                # Authentication & sessions
│   └── user/                # User management
├── common/                  # Shared utilities (filters, pipes, decorators)
├── core/                    # Central config (database, swagger)
└── shared/                  # Shared domain (value objects, exceptions, base classes)
```

### Design Principles

| Principle | Description |
|-----------|-------------|
| **DDD** | Business logic lives in domain entities and value objects |
| **CQRS** | Commands mutate state, Queries read — never mixed |
| **Clean Architecture** | Dependencies point inward: domain has zero external deps |
| **Result Pattern** | `neverthrow` Result<T, E> instead of thrown exceptions |
| **Soft Deletes** | Entities use `archived_at` instead of hard deletes |
| **UUIDv7** | Time-sortable unique identifiers for all entities |

---

## Prerequisites

- Node.js 20+
- pnpm 10+ (`npm install -g pnpm` or `brew install pnpm`)
- Docker & Docker Compose (for the database)

---

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

**Required variables:**
| Variable | Description |
|----------|-------------|
| `DB_HOST`, `DB_PORT` | PostgreSQL connection |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Database credentials |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Token signing secrets |
| Google / Facebook / Apple credentials | OAuth providers (optional) |

### 3. Start the database

```bash
pnpm docker:db
```

### 4. Run the server

```bash
pnpm start:dev
```

---

## Docker

### File Structure

```
docker/
├── Dockerfile              # Production (multi-stage build)
├── Dockerfile.dev          # Development
├── docker-compose.yml      # Production (API + PostgreSQL)
└── docker-compose.dev.yml  # Development (PostgreSQL only)
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm docker:db` | Start PostgreSQL only (local dev) |
| `pnpm docker:dev` | Start full dev environment |
| `pnpm docker:dev:build` | Rebuild & start dev environment |
| `pnpm docker:dev:down` | Stop dev environment |
| `pnpm docker:prod` | Start production (detached) |
| `pnpm docker:prod:build` | Rebuild & start production |
| `pnpm docker:prod:down` | Stop production |
| `pnpm docker:logs` | View container logs |

---

## Database Migrations

```bash
# Generate a new migration
pnpm typeorm:migration:generate src/migrations/MigrationName

# Run pending migrations
pnpm typeorm:migration:run

# Revert last migration
pnpm typeorm:migration:revert
```

---

## Testing

```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
pnpm test:cov      # With coverage report
pnpm test:unit     # Unit tests only
pnpm test:e2e      # End-to-end tests
```

---

## API Documentation

Once the server is running, Swagger docs are available at:

```
http://localhost:3001/api/docs
```

### Main Endpoints

#### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/sign-up` | Register a new user |
| `POST` | `/auth/sign-in` | Sign in |
| `POST` | `/auth/sign-out` | Sign out |
| `POST` | `/auth/refresh` | Refresh tokens |
| `POST` | `/auth/forgot-password` | Request password reset |
| `POST` | `/auth/reset-password` | Reset password |
| `GET` | `/auth/google` | Google OAuth |
| `GET` | `/auth/facebook` | Facebook OAuth |
| `GET` | `/auth/apple` | Apple OAuth |

#### User

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/me` | Get current user profile |

---

## License

Private — All rights reserved.
