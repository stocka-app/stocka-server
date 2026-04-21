/**
 * Unit-test coverage exclusions.
 *
 * Same policy as the E2E config: do NOT exclude files just because the OTHER
 * suite covers them. Unit coverage measures what unit specs ejecutan; the
 * MERGED report (unit + e2e) is the only one that integrates both layers and
 * is the one that defines DoD = 100%.
 *
 * Exclusion policy (the SHORT list):
 *   - BOILERPLATE  — NestJS DI wiring, barrel re-exports, type declarations
 *   - BOOTSTRAP    — App entry point, env validation, swagger config
 *   - SCHEMA/DDL   — Migrations, seeds, TypeORM entity decorators (no logic)
 *   - EXTERNAL     — Code that hits a real third-party service in production
 *                    and cannot run inside the test container (OAuth providers,
 *                    Resend email API)
 *   - FUTURE       — Wired but not yet exercised by any handler / endpoint
 */
module.exports = [
  // ── Include all src ──────────────────────────────────────────────────────
  'src/**/*.(t|j)s',

  // ── BOILERPLATE (no runtime logic) ───────────────────────────────────────
  '!src/**/*.module.ts',
  '!src/**/*.constants.ts',
  '!src/**/*.types.ts',
  '!src/**/index.ts',
  // DTOs: class-validator decorators only — validated implicitly by E2E (400 on bad input)
  '!src/**/*.dto.ts',

  // ── BOOTSTRAP (not exercisable through test layer) ───────────────────────
  '!src/core/infrastructure/main.ts',
  '!src/core/infrastructure/app.controller.ts',
  '!src/core/config/database/**',
  '!src/core/config/swagger/**',
  '!src/core/config/environment/**',

  // ── SCHEMA / DDL (no application logic) ──────────────────────────────────
  '!src/core/infrastructure/migrations/**',
  '!src/core/infrastructure/seeds/**',
  '!src/**/infrastructure/persistence/entities/**',
  '!src/**/infrastructure/entities/**',
  '!src/shared/infrastructure/persistence/entities/**',
  '!src/shared/infrastructure/base/**',

  // ── EXTERNAL: Email (requires Resend API key) ────────────────────────────
  '!src/shared/infrastructure/email/providers/**',
  '!src/shared/infrastructure/email/templates/**',
  '!src/shared/infrastructure/email/contracts/**',

  // ── EXTERNAL: OAuth (requires provider handshake) ────────────────────────
  '!src/**/infrastructure/strategies/**',
  '!src/**/infrastructure/controllers/google-authentication/**',
  '!src/**/infrastructure/controllers/facebook-authentication/**',
  '!src/**/infrastructure/controllers/microsoft-authentication/**',
  '!src/**/infrastructure/controllers/apple-authentication/**',
  '!src/**/infrastructure/controllers/apple-callback/**',
  '!src/**/infrastructure/controllers/google-callback/**',
  '!src/**/infrastructure/controllers/facebook-callback/**',
  '!src/**/infrastructure/controllers/microsoft-callback/**',

  // ── CQRS DTOs (command / query classes — pure data carriers, no logic) ───
  '!src/**/application/commands/**/*.command.ts',
  '!src/**/application/queries/**/*.query.ts',

  // ── FUTURE: wired with active imports but no caller exercises them yet ───
  '!src/bounded-contexts/user/profile/domain/models/commercial-profile.model.ts',
  '!src/bounded-contexts/user/profile/infrastructure/mappers/commercial-profile.mapper.ts',
  '!src/bounded-contexts/authorization/infrastructure/services/capability.service.ts',
  '!src/bounded-contexts/authorization/infrastructure/persistence/repositories/typeorm-tier-data-provider.ts',
  '!src/bounded-contexts/tenant/infrastructure/repositories/typeorm-tier-plan.repository.ts',
  '!src/bounded-contexts/tenant/application/queries/get-tenant-members/get-tenant-members.handler.ts',
  '!src/bounded-contexts/storage/infrastructure/repositories/typeorm-storage-activity-log.repository.ts',
];
