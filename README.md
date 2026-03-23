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
- npm 10+
- Docker & Docker Compose (for the database)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
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
npm run docker:db
```

### 4. Run the server

```bash
npm run start:dev
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
| `npm run docker:db` | Start PostgreSQL only (local dev) |
| `npm run docker:dev` | Start full dev environment |
| `npm run docker:dev:build` | Rebuild & start dev environment |
| `npm run docker:dev:down` | Stop dev environment |
| `npm run docker:prod` | Start production (detached) |
| `npm run docker:prod:build` | Rebuild & start production |
| `npm run docker:prod:down` | Stop production |
| `npm run docker:logs` | View container logs |

---

## Database Migrations

```bash
# Generate a new migration
npm run migration:generate -- src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## Testing

```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:cov      # With coverage report
npm run test:unit     # Unit tests only
npm run test:e2e      # End-to-end tests
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
