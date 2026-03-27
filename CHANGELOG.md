# Stocka — Changelog

All notable changes to this project are documented here.


## [0.8.0](https://github.com/stocka-app/stocka-server/compare/v0.7.0...v0.8.0) (2026-03-27)

### ✨ Features

* **rate-limit:** bypass rate limiting in E2E mode for test suite flexibility ([b94a6ff](https://github.com/stocka-app/stocka-server/commit/b94a6ff125adb9be10559aa3972eea3b209338d2))

## [0.7.0](https://github.com/stocka-app/stocka-server/compare/v0.6.0...v0.7.0) (2026-03-26)

### ✨ Features

* **auth:** [STOC-401](https://austins-industries.atlassian.net/browse/STOC-401) — embed tierLimits in JWT + add GET /api/tenants/me/capabilities ([c35bcb2](https://github.com/stocka-app/stocka-server/commit/c35bcb251f2d16e70a3f48a289a57af74983dc31))
* **storage:** [STOC-401](https://austins-industries.atlassian.net/browse/STOC-401) — add frozenAt to StorageAggregate + migration for FROZEN status support ([184a7cb](https://github.com/stocka-app/stocka-server/commit/184a7cb44ce88ec69e4f4cd9581c0f4f4932f6fe))
* **storage:** [STOC-409](https://austins-industries.atlassian.net/browse/STOC-409) — add description field to Storage BC ([68124c0](https://github.com/stocka-app/stocka-server/commit/68124c0d4f6a1f661cc5baa89afc0177aeb6a940))
* **storage:** [STOC-413](https://austins-industries.atlassian.net/browse/STOC-413) — add server-side pagination, search, and sort to GET /api/storages ([d901149](https://github.com/stocka-app/stocka-server/commit/d9011496788ce4942b0d5e44a979d8a8f92a890c))

### 🐛 Bug Fixes

* **storage:** [STOC-402](https://austins-industries.atlassian.net/browse/STOC-402) — fix PermissionGuard returns 401 NOT_AUTHENTICATED instead of 403 ([1617c26](https://github.com/stocka-app/stocka-server/commit/1617c26d563f6649b2ca6a403ffa5f506d49852c))

### 🔧 Refactoring

* **storage:** [STOC-410](https://austins-industries.atlassian.net/browse/STOC-410) — move StorageFilters from domain to application layer ([3565836](https://github.com/stocka-app/stocka-server/commit/3565836473fa4c04c90fbc5a26a2087ce0ace23e))

### 📚 Documentation

* **storage:** [STOC-412](https://austins-industries.atlassian.net/browse/STOC-412) — add JSDoc to setTenantToStarter e2e helper ([ede923e](https://github.com/stocka-app/stocka-server/commit/ede923e5c69ad735fd519787f3bfc548d62dacd2))

### 🧹 Chores

* reformat AddDescriptionToStorage migration (prettier) + add regen-changelog script ([a76754f](https://github.com/stocka-app/stocka-server/commit/a76754f2d8dcff2016d18d64202e51124afdf001))

## [0.6.0](https://github.com/stocka-app/stocka-server/compare/v0.5.0...v0.6.0) (2026-03-26)

### ✨ Features

* **storage:** [STOC-324](https://austins-industries.atlassian.net/browse/STOC-324) — extend ListStoragesHandler and IStorageRepository with status/type filters ([7c3a2b9](https://github.com/stocka-app/stocka-server/commit/7c3a2b93cb8b5f807e35aadc93408792c12bc43a))
* **storage:** [STOC-325](https://austins-industries.atlassian.net/browse/STOC-325) — add query params and status field to list-storages endpoint ([8c63b5e](https://github.com/stocka-app/stocka-server/commit/8c63b5e961805c914fe094689d7d01d8027222b0))

### ✅ Tests

* **storage:** [STOC-326](https://austins-industries.atlassian.net/browse/STOC-326) — add H-L2 scenario — status=ACTIVE filter returns only active storages ([3f130bc](https://github.com/stocka-app/stocka-server/commit/3f130bcbf0ea3b6a1b498193188b210607c27728))
* **storage:** [STOC-327](https://austins-industries.atlassian.net/browse/STOC-327) — E2E tests — GET /storages with status/type filters (E2E-L1/L2/L3) ([7770b17](https://github.com/stocka-app/stocka-server/commit/7770b17003f1ad27647ccb682810853ee9d1670f))

## [0.5.0](https://github.com/stocka-app/stocka-server/compare/v0.4.0...v0.5.0) (2026-03-26)

### ✨ Features

* **tenant:** [STOC-399](https://austins-industries.atlassian.net/browse/STOC-399) — add maxCustomRooms and maxStoreRooms to TierPlanModel and mapper ([5fdc3ff](https://github.com/stocka-app/stocka-server/commit/5fdc3ff6206de486244f59e6bc756ae17e0258f9))
* **tenant:** [STOC-399](https://austins-industries.atlassian.net/browse/STOC-399) — extend TierPlanLimits contract with maxCustomRooms and maxStoreRooms ([d5f4225](https://github.com/stocka-app/stocka-server/commit/d5f42253f38e75288b4ae41661f3b588fda7436b))

### 🧹 Chores

* **release:** [skip ci] backfill historical releases v0.3.1/v0.3.2 with correct dates ([e64a169](https://github.com/stocka-app/stocka-server/commit/e64a169812ad3c77df41a8c3f0d06f0ec2927cf3))

## [0.4.0](https://github.com/stocka-app/stocka-server/compare/v0.3.2...v0.4.0) (2026-03-25)

### ✨ Features

* **auth:** [Sprint 1] fetch Microsoft profile photo from Graph API on OAuth login ([9940f4f](https://github.com/stocka-app/stocka-server/commit/9940f4f74b658aad559929adce55e097e48a1c9a))
* **auth:** [STOC-296](https://austins-industries.atlassian.net/browse/STOC-296) — implement HMAC-SHA256 OAuth state verification with TTL ([3a319d8](https://github.com/stocka-app/stocka-server/commit/3a319d8a71b3bd5d504433bb66278ecf8c060378))
* **auth:** [STOC-297](https://austins-industries.atlassian.net/browse/STOC-297) — add rate limiting to sign-up and resend-verification-code endpoints ([31289f7](https://github.com/stocka-app/stocka-server/commit/31289f7eb088c91ef07c020efd56a7cd0f6c2209))
* **auth:** [STOC-299](https://austins-industries.atlassian.net/browse/STOC-299) — strengthen password policy and parse CORS_ORIGIN as allow-list ([0752ee3](https://github.com/stocka-app/stocka-server/commit/0752ee345d99e18b088143eac5ad3677c9937a5f))
* **env:** add OAUTH_STATE_SECRET validation and corresponding tests ([5089cbd](https://github.com/stocka-app/stocka-server/commit/5089cbd13c7050a4a146893c6a158db947d125d8))
* **user:** [Sprint 1] expose givenName, familyName, avatarUrl from GET /users/me ([0167861](https://github.com/stocka-app/stocka-server/commit/0167861a1d20b8e1f2d8d1a7d443aa610975e06c))
* **user:** [Sprint 1] implement OAuth provider profile extraction and social_profiles persistence ([32826d4](https://github.com/stocka-app/stocka-server/commit/32826d4385a9684f548b8c4b84d504c2419788d2))
* **user:** [Sprint 1] persist and expose displayName from OAuth providers ([56f1327](https://github.com/stocka-app/stocka-server/commit/56f1327e7a562f4be42873c132e085e085e51ce6))

### 🐛 Bug Fixes

* **auth:** [STOC-298](https://austins-industries.atlassian.net/browse/STOC-298) — validation hardening, cookie secure flag, trust proxy, Swagger dev-only ([4848e3f](https://github.com/stocka-app/stocka-server/commit/4848e3f3d892fcdaacf9f3e638b34c3699f63248))
* **user:** [Sprint 1] move upsertSocialProfile out of UoW transaction scope ([0f2a947](https://github.com/stocka-app/stocka-server/commit/0f2a94772b0b7beca7eb56c49f3a9cd553703979))
* **user:** resolve avatar not displaying for social login users ([4f4d6e1](https://github.com/stocka-app/stocka-server/commit/4f4d6e198ca5f20984bd1617cb5a4df20a47ec0d))

### ✅ Tests

* **rbac:** [Sprint 1] add e2e and unit tests for RBAC policy engine and permission guard ([ececae0](https://github.com/stocka-app/stocka-server/commit/ececae09234c1000e5d11f9a177918ea6c4a9ed1))
* **user:** [Sprint 1] restore 100% unit coverage after OAuth profile extraction ([7fe1858](https://github.com/stocka-app/stocka-server/commit/7fe18585537d562f060c29156f2cf10d70ccc4df))

## [0.3.2](https://github.com/stocka-app/stocka-server/compare/v0.3.1...v0.3.2) (2026-03-23)

### ✨ Features

* **rbac:** implement DB-driven RBAC with authz schema, catalog actions, and policy engine ([ceb59f9](https://github.com/stocka-app/stocka-server/commit/ceb59f9b8a7b751781e638c84ff55e596c757078))
* **user:** add consent management + fix get-me E2E route ([bd2d9af](https://github.com/stocka-app/stocka-server/commit/bd2d9af712d900c14ae99733a229c3a1c0145d24))

### 🔧 Refactoring

* **rbac:** extract seed data from migrations into dedicated seeds pipeline ([12b8d78](https://github.com/stocka-app/stocka-server/commit/12b8d78b202764aebc1c35d58e1eb714ed1c3d3b))

### 📚 Documentation

* rewrite README in English with improved structure and badges ([3eb7861](https://github.com/stocka-app/stocka-server/commit/3eb78617303f46d111a56079e2ce2693e54e866f))

## [0.3.1](https://github.com/stocka-app/stocka-server/compare/v0.3.0...v0.3.1) (2026-03-20)

### ✨ Features

* **auth:** [STOC-192](https://austins-industries.atlassian.net/browse/STOC-192) — add OAuth popup callback support via cookie propagation ([d27b2d7](https://github.com/stocka-app/stocka-server/commit/d27b2d7cb07df241dd327eab6d30706c183b0327))
* **common:** [STOC-258](https://austins-industries.atlassian.net/browse/STOC-258) — add @CurrentTenant and @CurrentMember decorators ([8c6255e](https://github.com/stocka-app/stocka-server/commit/8c6255ee991d70b8084ab0c7ea8eb50d6dcd33fa))
* **common:** [STOC-258](https://austins-industries.atlassian.net/browse/STOC-258) — add TenantGuard and TenantStateGuard ([7c36f22](https://github.com/stocka-app/stocka-server/commit/7c36f222c9471761e7cd397b3047cafd3c153f54))
* **migration:** add initial domain schemas and tables for auth, identity, tenants, and storage ([dbffff2](https://github.com/stocka-app/stocka-server/commit/dbffff241b691e77951ca550c3e4e8dadf054d69))
* **onboarding:** [STOC-259](https://austins-industries.atlassian.net/browse/STOC-259) — implement OnboardingBC — session persistence, CREATE and JOIN paths ([535a723](https://github.com/stocka-app/stocka-server/commit/535a7239f9327016432599d85b581a2e4bc3c844))
* **shared:** [STOC-259](https://austins-industries.atlassian.net/browse/STOC-259) — wire OnboardingModule in AppModule + extend domain-error-mapper ([fca8af8](https://github.com/stocka-app/stocka-server/commit/fca8af8abb13f4197a96cc04b56040886d739f75))
* **storage:** [STOC-257](https://austins-industries.atlassian.net/browse/STOC-257) — implement Storage BC — Anchor Table pattern, 3 storage types, tier enforcement, CRUD endpoints ([d6f28a3](https://github.com/stocka-app/stocka-server/commit/d6f28a3c1d0363ef198266f2f4d6528e53d5b678))
* **tenant:** [STOC-257](https://austins-industries.atlassian.net/browse/STOC-257) — add maxCustomRooms + maxStoreRooms to TenantConfig — storage tier limits ([acfc47e](https://github.com/stocka-app/stocka-server/commit/acfc47e7c8b3a81646c2b034adabc235f78ccb34))
* **tenant:** [STOC-260](https://austins-industries.atlassian.net/browse/STOC-260) — add invitation commands and queries ([20b489a](https://github.com/stocka-app/stocka-server/commit/20b489af147701cd85e4f631a84fb9911d9169bd))
* **tenant:** [STOC-260](https://austins-industries.atlassian.net/browse/STOC-260) — add invitation HTTP controllers and wire TenantModule ([818728f](https://github.com/stocka-app/stocka-server/commit/818728f005e269656df5bd2c54a4bf531a0a00c0))
* **tenant:** [STOC-260](https://austins-industries.atlassian.net/browse/STOC-260) — add TenantInvitationModel, entity, contract and role-hierarchy service ([3071b2d](https://github.com/stocka-app/stocka-server/commit/3071b2dfa811cf42bb98a89e963c1b316bd0092f))

### 🐛 Bug Fixes

* **auth:** [STOC-192](https://austins-industries.atlassian.net/browse/STOC-192) — fix OAuth popup via state parameter instead of cookies ([00cabcf](https://github.com/stocka-app/stocka-server/commit/00cabcf71bbe8e8066c0000145e1ee06ea36c38b))
* **auth:** [STOC-192](https://austins-industries.atlassian.net/browse/STOC-192) — fix OAuth popup: override COOP header to preserve window.opener ([1e02705](https://github.com/stocka-app/stocka-server/commit/1e0270548e909ea962f88481d325b3b178a1e8ac))
* **auth:** [STOC-192](https://austins-industries.atlassian.net/browse/STOC-192) — fix OAuth popup: override Helmet CSP and correct fallback redirect path ([2d6c448](https://github.com/stocka-app/stocka-server/commit/2d6c448fb20d9f9018248a479acf1be7ea8bb867))
* **auth:** [STOC-192](https://austins-industries.atlassian.net/browse/STOC-192) — fix OAuth popup: redirect to frontend callback for same-origin postMessage ([9dd1a16](https://github.com/stocka-app/stocka-server/commit/9dd1a166915ccccf7570904c26e638c0ac2d79fd))
* **auth:** replace getOrThrow with get+fallback in disabled OAuth strategies ([b62959c](https://github.com/stocka-app/stocka-server/commit/b62959c0d403715e68df626a4db976badec31bf6))
* **infra:** fix cross-platform typeorm CLI and remove duplicate migration ([f88f11b](https://github.com/stocka-app/stocka-server/commit/f88f11b97513c2043dedad32b910f701aa5e3e71))
* **tenant:** [STOC-260](https://austins-industries.atlassian.net/browse/STOC-260) — fix e2e schema setup and istanbul ignore on unreachable guard branches ([2bd1739](https://github.com/stocka-app/stocka-server/commit/2bd17395ad09c4b63e43fe1c0d7029dca46395b1))

### 🔧 Refactoring

* **common:** [STOC-258](https://austins-industries.atlassian.net/browse/STOC-258) — use cached membershipContext in PermissionGuard ([4d2b454](https://github.com/stocka-app/stocka-server/commit/4d2b45498ee4830ede29ca760a8374b657f56814))
* **entities:** [STOC-290](https://austins-industries.atlassian.net/browse/STOC-290) — expand to 12 PostgreSQL schemas (authn, accounts, sessions, profiles, tiers, capabilities) ([926982e](https://github.com/stocka-app/stocka-server/commit/926982eb1646ee928b57ae3f5e51cc95ba3e83e2))
* **infra:** [STOC-290](https://austins-industries.atlassian.net/browse/STOC-290) — assign PostgreSQL schema to all 30 TypeORM entities ([c9ee3e0](https://github.com/stocka-app/stocka-server/commit/c9ee3e099ab98a52ca1c6d2ed4f279ce9cf502a9))
* **migrations:** [STOC-290](https://austins-industries.atlassian.net/browse/STOC-290) — consolidate all migrations into single schema-aware InitialSchema ([c42e6b4](https://github.com/stocka-app/stocka-server/commit/c42e6b46497f0b66e646b109a2149fe4fec2fcdd))
* **migrations:** [STOC-290](https://austins-industries.atlassian.net/browse/STOC-290) — regenerate InitialSchema for 12-schema architecture ([fa0a79b](https://github.com/stocka-app/stocka-server/commit/fa0a79b7e361a584c6623ff6da901499d15a80fb))
* **test:** [STOC-290](https://austins-industries.atlassian.net/browse/STOC-290) — update e2e infra and specs for 12-schema architecture ([7543ca7](https://github.com/stocka-app/stocka-server/commit/7543ca7179377255b274b8b7edfedbc26cc444cc))
* **test:** [STOC-290](https://austins-industries.atlassian.net/browse/STOC-290) — update e2e infra for domain schema isolation ([b8fc4ac](https://github.com/stocka-app/stocka-server/commit/b8fc4ac97073be791a100f8e8b06aef93eea1360))

### 🧹 Chores

* **auth:** disable Facebook OAuth provider ([dc9635e](https://github.com/stocka-app/stocka-server/commit/dc9635efe4b8eab4c35373fa45fb9e9a3b34b392))
* **onboarding:** [STOC-259](https://austins-industries.atlassian.net/browse/STOC-259) — add @onboarding/* path alias and injection tokens ([24d44f1](https://github.com/stocka-app/stocka-server/commit/24d44f12b9e6068875710b5c90551acfecb4ef43))
* **storage:** [STOC-257](https://austins-industries.atlassian.net/browse/STOC-257) — add @storage/* path alias and STORAGE_CONTRACT/TENANT_CAPABILITIES_PORT tokens ([7c02eaa](https://github.com/stocka-app/stocka-server/commit/7c02eaa1e373ad135b6150b08b87974e9bf66be3))

### ✅ Tests

* **auth:** [STOC-247](https://austins-industries.atlassian.net/browse/STOC-247) — add strategy unit tests covering disabled-provider instantiation and validate() logic ([391ecbc](https://github.com/stocka-app/stocka-server/commit/391ecbc43fce9950d7c92b5b712c1d12a107a369))
* **common:** [STOC-258](https://austins-industries.atlassian.net/browse/STOC-258) — BDD unit tests — tenant guards, decorators, permission cache ([2c5abeb](https://github.com/stocka-app/stocka-server/commit/2c5abebae08c0c4c2015d2527df033a40c75ec45))
* **onboarding:** [STOC-259](https://austins-industries.atlassian.net/browse/STOC-259) — BDD unit tests for OnboardingBC — 100% MERGED coverage ([e3dcf21](https://github.com/stocka-app/stocka-server/commit/e3dcf2107aa2737535e8c5ae2748dcf7e90aedd5))
* **storage,tenant:** [STOC-257](https://austins-industries.atlassian.net/browse/STOC-257) — BDD unit tests for Storage BC and updated tenant/shared tests ([a637b65](https://github.com/stocka-app/stocka-server/commit/a637b657ab9bd88ca2b1ecb8e7d53e928a242c14))
* **tenant:** [STOC-260](https://austins-industries.atlassian.net/browse/STOC-260) — add invitation e2e suite covering all 7 tenant controllers ([3c1da5e](https://github.com/stocka-app/stocka-server/commit/3c1da5e4746dd474249429d58d5be217635c4e25))
* **tenant:** [STOC-260](https://austins-industries.atlassian.net/browse/STOC-260) — BDD unit tests — invitation flow, domain services, 100% MERGED coverage ([ee7efd1](https://github.com/stocka-app/stocka-server/commit/ee7efd1c2f5f2240a2f22192a7d19428d6be7338))
* **tenant:** [STOC-260](https://austins-industries.atlassian.net/browse/STOC-260) — cover DomainException path in AcceptInvitationHandler catch block ([a5d65ff](https://github.com/stocka-app/stocka-server/commit/a5d65ffcb8c042dff0bd4d1faa5e5cdbd3754d8d))
* **user:** [STOC-260](https://austins-industries.atlassian.net/browse/STOC-260) — add unit tests for User BC domain models and mappers ([dfca5eb](https://github.com/stocka-app/stocka-server/commit/dfca5eb15cd2709672a50392c23f3ef9f7c6b037))

## [0.3.0](https://github.com/stocka-app/stocka-server/compare/v0.2.1...v0.3.0) (2026-03-19)

### ✨ Features

* **auth:** [STOC-256](https://austins-industries.atlassian.net/browse/STOC-256) — extend JWT payload with tenantId and role via MediatorService ([bb1b082](https://github.com/stocka-app/stocka-server/commit/bb1b0825241b022b92e9612ec55c993ad30d3b44))
* **auth:** [STOC-256](https://austins-industries.atlassian.net/browse/STOC-256) — include tenantId and role in all JWT token generation steps ([8ce8b85](https://github.com/stocka-app/stocka-server/commit/8ce8b8546a11c310636d1e944ee988880f28c8db))
* **common:** [STOC-256](https://austins-industries.atlassian.net/browse/STOC-256) — add @RequireAction decorator and PermissionGuard — 7-step RBAC cascade ([e5e1f69](https://github.com/stocka-app/stocka-server/commit/e5e1f69c38ee63a505b0b2cb4531df745dc6640e))
* **shared:** [STOC-279](https://austins-industries.atlassian.net/browse/STOC-279) — add SystemAction enum — Actions Catalog for Policy Engine ([32718b4](https://github.com/stocka-app/stocka-server/commit/32718b44bd72881715b8628c349fc390b8965a8d))
* **tenant:** [STOC-279](https://austins-industries.atlassian.net/browse/STOC-279) — add DB-backed Policy Engine — tier plans, capabilities, snapshot ([dc8f78f](https://github.com/stocka-app/stocka-server/commit/dc8f78f9277f8ef18c05b83a41a7d94d3278a522))

### 🐛 Bug Fixes

* **shared:** [STOC-256](https://austins-industries.atlassian.net/browse/STOC-256) — make MediatorService graceful when TenantModule unavailable ([a7f0ec3](https://github.com/stocka-app/stocka-server/commit/a7f0ec3bca5ef8db6e64e09938fc65acd7626a4b))

### ✅ Tests

* **common,auth,tenant:** [STOC-256](https://austins-industries.atlassian.net/browse/STOC-256) — BDD unit tests for PermissionGuard and updated specs ([82f8141](https://github.com/stocka-app/stocka-server/commit/82f814126b8c4e4bc13e284d122a853bc5210679))
* **shared:** [STOC-279](https://austins-industries.atlassian.net/browse/STOC-279) — add BDD unit tests for CapabilityResolver and TierPolicyConfig ([fb00f1a](https://github.com/stocka-app/stocka-server/commit/fb00f1a4106bbaaf3c5a9c7c14064f90c9d9afdc))
* **tenant,common:** [STOC-279](https://austins-industries.atlassian.net/browse/STOC-279) — achieve 100% MERGED coverage ([fa4d3cd](https://github.com/stocka-app/stocka-server/commit/fa4d3cd388a0fe521f6a2577fecda8177fcd25d7))
* **tenant:** [STOC-279](https://austins-industries.atlassian.net/browse/STOC-279) — add unit coverage for tier infra layer and recover MERGED ≥ 98.87% ([aebede7](https://github.com/stocka-app/stocka-server/commit/aebede7b10b9792970b099a5e79891f69646a3ce))

## [0.2.1](https://github.com/stocka-app/stocka-server/compare/v0.2.0...v0.2.1) (2026-03-18)

### 🧹 Chores

* update .gitignore to include all githooks ([76fc8a8](https://github.com/stocka-app/stocka-server/commit/76fc8a8b977bdb0312b66a60411f57a399cd4332))

## [0.2.0](https://github.com/stocka-app/stocka-server/compare/v0.1.0...v0.2.0) (2026-03-18)

### ✨ Features

* add custom validator for ISO 3166-1 alpha-2 country codes ([389c7f1](https://github.com/stocka-app/stocka-server/commit/389c7f110dbc796fff8b83e4112bc044313577a3))
* **eslint:** enforce single HTTP operation per controller ([62e4135](https://github.com/stocka-app/stocka-server/commit/62e4135ea4701495be755db715ce79ac44dd9557))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add application layer — commands, queries, facade ([a824d4f](https://github.com/stocka-app/stocka-server/commit/a824d4ff0fed803563453c79e7982d400a0a544e))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add infrastructure layer — entities, mappers, repos, HTTP, module ([2799961](https://github.com/stocka-app/stocka-server/commit/2799961aae684445f8219476c67dc93308617bae))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add Tenant BC domain layer ([d0c3e58](https://github.com/stocka-app/stocka-server/commit/d0c3e5853e8bf1f62262d8be96d67f9e64fddce7))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — implement complete onboarding flow and refactor tenant commands ([d1efa3e](https://github.com/stocka-app/stocka-server/commit/d1efa3eaa335310cae41d46204b7d3b7a83a022e))
* **tenant:** update CreateTenant command and result structure, refactor related components ([11f0e3d](https://github.com/stocka-app/stocka-server/commit/11f0e3d3bae4f635018938215ffd8dc74db6fbfc))

### 🐛 Bug Fixes

* **tenant:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add MediatorService mock to CreateTenantHandler spec ([6f0edcd](https://github.com/stocka-app/stocka-server/commit/6f0edcde70ee052f69336ce29a54343ca2945cfe))

### 🧹 Chores

* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add config, aliases, migration for Tenant BC ([50929c6](https://github.com/stocka-app/stocka-server/commit/50929c656b7ace510322b3022ee3fc7460d59423))

### ✅ Tests

* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add 121 unit tests for Tenant BC ([0cae5a8](https://github.com/stocka-app/stocka-server/commit/0cae5a8422e7258d2408af15fa851e07a645d2b5))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add edge-case tests for handler catch branches ([751f2aa](https://github.com/stocka-app/stocka-server/commit/751f2aa063c42375be9b6b2d26a97e34c184e9b1))

## [0.1.0](https://github.com/stocka-app/stocka-server/compare/1df19335827094ba092851d7f6318519481d7aab...v0.1.0) (2026-03-18)

### ✨ Features

* add custom validator for ISO 3166-1 alpha-2 country codes ([60f4513](https://github.com/stocka-app/stocka-server/commit/60f4513078b5fb0f88a0eb55095f074f7aa08721))
* add tsconfig for test environment with path aliases ([e619b68](https://github.com/stocka-app/stocka-server/commit/e619b687eab0f5a19fafb52b3f9f081f6b2d9e74))
* **auth-infra:** add controllers, guards, strategies and facade ([9beadaa](https://github.com/stocka-app/stocka-server/commit/9beadaae70e0bc285d8ffa31dae28e53a9427629))
* **auth:** add auth application layer (commands and event handlers) ([84fad11](https://github.com/stocka-app/stocka-server/commit/84fad11363b309d57073563257a4541547b63db2))
* **auth:** add auth domain layer (models, contracts, events, exceptions) ([c2ed95a](https://github.com/stocka-app/stocka-server/commit/c2ed95a05516d2a700ab5ec0d8bac6440fd005c8))
* **auth:** add auth persistence layer (entities, mappers, repositories) ([9627e55](https://github.com/stocka-app/stocka-server/commit/9627e55aeae7370755c7f1a8dc0f13a9ee54e170))
* **auth:** add custom authorization parameters for Microsoft strategy ([825e4d6](https://github.com/stocka-app/stocka-server/commit/825e4d6a2af2ef8a39d317396bc146f1b226164d))
* **auth:** add EmailDeliveryFailedException ([09681b8](https://github.com/stocka-app/stocka-server/commit/09681b895d3caa5357dcc56aafbb36f015986efc))
* **auth:** add EmailNotVerifiedException ([d98c39c](https://github.com/stocka-app/stocka-server/commit/d98c39c9ea3373ee86ca007b0dcb8d582eec9b84))
* **auth:** add emailVerificationRequired to sign-in response ([18e5f94](https://github.com/stocka-app/stocka-server/commit/18e5f94257b6b069aaefa0fdfcda77323a2d3cca))
* **auth:** add feature flags and Microsoft OAuth env variables ([96d2892](https://github.com/stocka-app/stocka-server/commit/96d28927295928ebd570e26ee9e9b378d1e2f1ed))
* **auth:** add feature flags to social auth guards ([9a2b60d](https://github.com/stocka-app/stocka-server/commit/9a2b60d0dcb3dbd72e5eec96259f86ef5fcf0e62))
* **auth:** add filtered rate limit queries to verification attempt contract ([7a286bd](https://github.com/stocka-app/stocka-server/commit/7a286bde57f8ca092354ca657e7d6da05d0f3a6c))
* **auth:** add new exception classes for invalid IP address, user agent, verification type, and attempted at ([18db002](https://github.com/stocka-app/stocka-server/commit/18db002b55acc4aa85caeb92bee3ba7b5c6fbd95))
* **auth:** add SIGN_IN verification type ([fe8756e](https://github.com/stocka-app/stocka-server/commit/fe8756ec7906b7be21f178fa8e8830dfb8df36d0))
* **auth:** add SocialProvider enum and auth providers endpoint ([1737489](https://github.com/stocka-app/stocka-server/commit/173748912c44841b291007baa96908ae39634faf))
* **auth:** add unit tests for password recovery and verification code resend email delivery ([044d50c](https://github.com/stocka-app/stocka-server/commit/044d50c607e66e436c32c1092ed91e9501f282dd))
* **auth:** apply rate limiting to sign-in and forgot-password endpoints ([cf70bf4](https://github.com/stocka-app/stocka-server/commit/cf70bf4c077db8d276bbab7eeb47177fca1f6008))
* **auth:** EC-001 — conditional password reset email for social accounts (STOC-219) ([0425525](https://github.com/stocka-app/stocka-server/commit/0425525d44da93aade013c557775807353d38c7f))
* **auth:** EC-002 block manual sign-in for Flexible Pendiente accounts (STOC-221) ([1a2e931](https://github.com/stocka-app/stocka-server/commit/1a2e9318b91d668cde4edfb3438f1a3d456289be))
* **auth:** EC-002 link OAuth provider to existing account on social sign-in ([531666d](https://github.com/stocka-app/stocka-server/commit/531666d6df385e8e2c187d7ade8b32ab585d2041))
* **auth:** email i18n via Accept-Language header (STOC-208) ([11f7f28](https://github.com/stocka-app/stocka-server/commit/11f7f2885da45abb4e415f18e57e7ddccb67d42a))
* **auth:** enhance domain exceptions with metadata support ([f2e3236](https://github.com/stocka-app/stocka-server/commit/f2e3236244d0e0215a01c72a7cf7a2b4a2ffda0d))
* **auth:** enhance verification attempt model with value objects and validation ([28977d8](https://github.com/stocka-app/stocka-server/commit/28977d8b06c23d68329fbb8e63fc6413b5879f3a))
* **authentication:** [STOC-253](https://austins-industries.atlassian.net/browse/STOC-253) — migrate SocialSignInHandler to SocialSignInSaga ([f2845b1](https://github.com/stocka-app/stocka-server/commit/f2845b1d56b8a196e379690c4d84d00227d02a84))
* **authentication:** implement sign-up saga and steps ([877d4d5](https://github.com/stocka-app/stocka-server/commit/877d4d5505262022e6116f20aaff01a4cf65c72e))
* **auth:** implement Microsoft OAuth authentication ([c42fe5e](https://github.com/stocka-app/stocka-server/commit/c42fe5ed11563798aaf75df0c9f21406a2d6c530))
* **auth:** make codeEntered nullable in VerificationAttemptEntity ([47f119c](https://github.com/stocka-app/stocka-server/commit/47f119cb79e43de8c769c583a1d4cc2cf2804d3b))
* **auth:** make codeEntered nullable in VerificationAttemptModel ([6f81c2b](https://github.com/stocka-app/stocka-server/commit/6f81c2bbbed799d84ff5af406e4ac29373179efb))
* **auth:** migrate refresh token to httpOnly cookie (STOC-215) ([1021da2](https://github.com/stocka-app/stocka-server/commit/1021da275232fd771bb16df56b1e22311482bd8b))
* **auth:** register Microsoft OAuth and AuthProviders in AuthModule ([cfb701e](https://github.com/stocka-app/stocka-server/commit/cfb701eb967a2c1fa4b936d58db01c47c7d38650))
* **auth:** update VerificationAttemptMapper for nullable codeEntered ([3927b4a](https://github.com/stocka-app/stocka-server/commit/3927b4a19d76a6193545edbbd8837c781db12c93))
* **common:** add centralized rate limiting guard and interceptor ([bf96d1c](https://github.com/stocka-app/stocka-server/commit/bf96d1cd13297589039fb1a11b84c762b8104b66))
* **common:** add rate limiting decorators ([66f006b](https://github.com/stocka-app/stocka-server/commit/66f006ba055c1951020ed675dee2f3d332d7334a))
* **common:** add utilities, constants, filters and interceptors ([1286470](https://github.com/stocka-app/stocka-server/commit/1286470a65cc2425cce7020e0060839447620463))
* **core:** add database, env validation and swagger configuration ([246c1b0](https://github.com/stocka-app/stocka-server/commit/246c1b02a31ae19cabb314d1c9987f63f00d05cd))
* **core:** register ThrottlerModule and rate limiting providers ([39fd767](https://github.com/stocka-app/stocka-server/commit/39fd7674c3c61565c775661956f045b0765d16cb))
* **core:** wire up auth module, app module and application bootstrap ([210ba0f](https://github.com/stocka-app/stocka-server/commit/210ba0f8f3d202c905928c267bc398f25f2f81d5))
* **database:** add database migrations ([e79409e](https://github.com/stocka-app/stocka-server/commit/e79409e8b23d75480c1c9fedfca9477cbc87f3ff))
* **db:** add account_type and created_with columns to users (STOC-217) ([7ad3694](https://github.com/stocka-app/stocka-server/commit/7ad3694b613bf6aa4579a165873cfe7f01afce21))
* **db:** disable TypeORM auto-sync and generate InitialSchema migration (STOC-193) ([fec1e8f](https://github.com/stocka-app/stocka-server/commit/fec1e8f1cf53b2e2ad546a87125d7af366d5c76b))
* **db:** migration for created_with and account_type columns in users table (STOC-223) ([f824720](https://github.com/stocka-app/stocka-server/commit/f8247201c389b1780722c9cc066deddb14f80941))
* **dependencies:** add neverthrow library for enhanced error handling ([cae2cef](https://github.com/stocka-app/stocka-server/commit/cae2cef916899e1caf71681ab1c070359ad1c979))
* **eslint:** enforce single HTTP operation per controller ([025359c](https://github.com/stocka-app/stocka-server/commit/025359cf9b2cb9d4d89878c339b007e5568ed6aa))
* **exception:** refactor domain exception handling and introduce error mapping utility ([1fabf22](https://github.com/stocka-app/stocka-server/commit/1fabf228a894f845cc5f89a04442ea0e289f57c4))
* **google-strategy:** add authorizationParams method to enforce account selection prompt ([6a01598](https://github.com/stocka-app/stocka-server/commit/6a01598f5e481bf263fd4f0e399b265fd0ec36e8))
* **health:** add GET /api/health endpoint with TypeORM check (STOC-196) ([9291d88](https://github.com/stocka-app/stocka-server/commit/9291d883c39b8a763b42ec63a37d252ed4dcf9c8))
* **result:** add ResultModelDomainException type for enhanced error handling ([4d0d6bd](https://github.com/stocka-app/stocka-server/commit/4d0d6bd0c782316741731b96b383bb7be734a3aa))
* **saga:** implement Saga orchestrator with step configuration, retry policies and compensation process ([f0de311](https://github.com/stocka-app/stocka-server/commit/f0de3111b402dfe0123cb655961d111584eca906))
* **shared-domain:** add base classes, value objects and exceptions ([ca22fe6](https://github.com/stocka-app/stocka-server/commit/ca22fe6ffc2b39875fe37a89fd00ed331c732864))
* **shared-infra:** add mediator, services and email module ([1151bf7](https://github.com/stocka-app/stocka-server/commit/1151bf7cb3127efee24740050557fb81caf7d158))
* **shared:** add integration events for cross-BC mutations ([5973960](https://github.com/stocka-app/stocka-server/commit/59739603060c2a0c16aa25e8aae37f36e78ffd45))
* **shared:** add IUserView and IUserFacade contracts ([5225ee1](https://github.com/stocka-app/stocka-server/commit/5225ee119fff0c4fdc80ba7bb4d7723b68b4334a))
* **shared:** add process manager in-memory state store ([ac43bc4](https://github.com/stocka-app/stocka-server/commit/ac43bc4cf157c0d621aaecf012593a26730afa31))
* **shared:** add ProcessManager base class and persistence layer ([cd0f1d8](https://github.com/stocka-app/stocka-server/commit/cd0f1d85f81e234466bf61c88d271f11533c1db5))
* **shared:** add Unit of Work pattern with TypeORM implementation ([c3a6692](https://github.com/stocka-app/stocka-server/commit/c3a669275e5654b8e78c7264dfbb2b8208e6fed2))
* **shared:** add withRetry utility and apply to email event handlers ([a413b28](https://github.com/stocka-app/stocka-server/commit/a413b28a369e136474eb21ca016761da1341e07c))
* **social-account:** implement social account persistence and integrate with user creation ([ef339fc](https://github.com/stocka-app/stocka-server/commit/ef339fc5312c161989070e781ca23c4985fc7b11))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add application layer — commands, queries, facade ([5c8abdb](https://github.com/stocka-app/stocka-server/commit/5c8abdbfee9646ecd8f3ec5d45e34f03a86c7976))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add infrastructure layer — entities, mappers, repos, HTTP, module ([9a9d5b4](https://github.com/stocka-app/stocka-server/commit/9a9d5b4dd0910b7d7d3c4a8a56460416257b0f42))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add Tenant BC domain layer ([ff68da5](https://github.com/stocka-app/stocka-server/commit/ff68da51a79d942054255f9f5b8e45bc5f7907c0))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — implement complete onboarding flow and refactor tenant commands ([67f579b](https://github.com/stocka-app/stocka-server/commit/67f579b551ff3a7e5daf2d6d0c5ac6da3da52d6e))
* **unit-of-work:** implement AsyncLocalStorage for transaction scoping and add isActive method ([f38852d](https://github.com/stocka-app/stocka-server/commit/f38852dc639291fc0acb720142fc4dbaae0aa290))
* **user-bc:** add event handlers for cross-BC mutations via integration events ([362932b](https://github.com/stocka-app/stocka-server/commit/362932b7396918d7c9d783ba3515d3246c1b84d7))
* **user:** add flexible account support and mediator ops (STOC-218) ([c307b07](https://github.com/stocka-app/stocka-server/commit/c307b078991ab10e4dc7f6cb16085c47a74dd34e))
* **user:** add user bounded context domain layer ([099785c](https://github.com/stocka-app/stocka-server/commit/099785c0833a05f6515d07579a4e76ee1d89e56f))
* **user:** add user infrastructure and application layers ([667511a](https://github.com/stocka-app/stocka-server/commit/667511a819db71f05d9291507997d39d12c45997))
* **user:** cleanup job — purge stale unverified users, exclude Flexible Pendiente (STOC-228) ([6f47f6c](https://github.com/stocka-app/stocka-server/commit/6f47f6cf7ee444ffc47c9e30075f4b25d189d2da))
* **user:** complete STOC-218 — flexible account domain model and mediator ops ([060c553](https://github.com/stocka-app/stocka-server/commit/060c553e5b8f4f3969ab6dc6599c7aba789a50ab))
* **user:** enhance FindUserByUUID query handling and update GetMe controller to use result type ([1e2ea01](https://github.com/stocka-app/stocka-server/commit/1e2ea01e1525e082529f18abe56f8923a1cc9b6b))
* **user:** refactor email value object and update imports ([3bf898a](https://github.com/stocka-app/stocka-server/commit/3bf898a4e2a620b62c8ca58a335b29c99fd89e17))

### 🐛 Bug Fixes

* **auth:** [STOC-245](https://austins-industries.atlassian.net/browse/STOC-245) — harden UoW against released QR + make VerificationAttempt UoW-aware ([9f27ea4](https://github.com/stocka-app/stocka-server/commit/9f27ea49112e595fb63fc234a0e48f8feb9f578a))
* **auth:** [STOC-252](https://austins-industries.atlassian.net/browse/STOC-252) — make archiveAllByUserId UoW-aware ([6445c21](https://github.com/stocka-app/stocka-server/commit/6445c2125cb7b410a9f5e251cace5c7854ed04f5))
* **auth:** correct Microsoft strategy type definitions ([76110e0](https://github.com/stocka-app/stocka-server/commit/76110e082e8c8d9d6bb6108ea7f3d413a85e18c7))
* **authentication:** make TypeOrmSessionRepository.archive() UoW-aware ([e627a94](https://github.com/stocka-app/stocka-server/commit/e627a946d2e8b0234c7c9953cdece222517162ef))
* **auth:** format description in Microsoft OAuth operation ([d217513](https://github.com/stocka-app/stocka-server/commit/d2175135d961d83e65c67133c6d732385ff2f3c8))
* **auth:** update EmailVO import path and use factory method for IpAddressVO ([63724b9](https://github.com/stocka-app/stocka-server/commit/63724b9a8eedb0a1455784d0376cbc4d2047f2a0))
* **env:** make RESEND_API_KEY a required field and remove dummy key fallback ([34a0e7a](https://github.com/stocka-app/stocka-server/commit/34a0e7accf79231a013da9b5be5751906d467060))
* **main:** handle bootstrap errors and ensure application exits on failure ([7bba397](https://github.com/stocka-app/stocka-server/commit/7bba39795090ab4e0d7f13b5e3d3d9d164fa7bf9))
* **rate-limit:** validate email format before creating VerificationAttempt ([a2bd389](https://github.com/stocka-app/stocka-server/commit/a2bd389b1fc0f859614078aca3cf68fa490045a1))
* **shared:** [STOC-268](https://austins-industries.atlassian.net/browse/STOC-268) — fix AsyncLocalStorage leak in TypeOrmUnitOfWork ([811c650](https://github.com/stocka-app/stocka-server/commit/811c650ebbb398df1991c5d463eb4ee0c785eec2))
* **tenant:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add MediatorService mock to CreateTenantHandler spec ([832c4eb](https://github.com/stocka-app/stocka-server/commit/832c4eb6c509e9a83ef27e79a792dbd964d9796f))
* **test:** mocks y paths centralizados, limpieza de estrategias sociales, tests robustos y configuración profesional ([c4475fc](https://github.com/stocka-app/stocka-server/commit/c4475fc281e7ca4235b74436b18a50a02094bb60))
* **test:** update sign-up handler tests for new dependencies ([adb1020](https://github.com/stocka-app/stocka-server/commit/adb1020cc7b96266912eb938a507f64f6b25afc4))
* **user:** [STOC-253](https://austins-industries.atlassian.net/browse/STOC-253) — make TypeOrmSocialAccountRepository UoW-aware ([4ae6803](https://github.com/stocka-app/stocka-server/commit/4ae68030157973f83c716b791421233ef1b00b7d))
* **user:** [STOC-271](https://austins-industries.atlassian.net/browse/STOC-271) — fix lint errors in STOC-271 scope — no-non-null-assertion, require-await, naming-convention ([fdde6cb](https://github.com/stocka-app/stocka-server/commit/fdde6cb1094b9a1c8de19ab2babd8f21a4c74a95))
* **user:** add providers and  reorder exports in UserModule for fix error: UnknownExportException [Error]: Nest cannot export a provider/module that is not a part of the currently processed module (UserModule). ([882650c](https://github.com/stocka-app/stocka-server/commit/882650cf61d5497decece4a57914667b3a9943bf))
* **with-retry:** ensure lastError is defined and improve logging for retry attempts ([2813725](https://github.com/stocka-app/stocka-server/commit/2813725095564899a0c28dc6d452412ef2aa2316))

### 🔧 Refactoring

* **app:** align user/core/shared flows with authentication context ([9f4f5e3](https://github.com/stocka-app/stocka-server/commit/9f4f5e34ee42e32cb9bf0658ccb2e61c0ca2787c))
* **auth-bc:** introduce neverthrow Result types in auth-result.types ([9ad8cbc](https://github.com/stocka-app/stocka-server/commit/9ad8cbc5c98b5ee21c4cc9e47bb029067f2d5594))
* **auth-bc:** migrate handlers to typed mediator and IUserView ([fb09946](https://github.com/stocka-app/stocka-server/commit/fb099464736c533562576bd6f7120dc08d33fd7c))
* **auth-bc:** refresh-session handler and controller use neverthrow Result ([4450f4d](https://github.com/stocka-app/stocka-server/commit/4450f4db132ea51816262808ae8424a77e13403b))
* **auth-bc:** resend-verification-code handler and controller use neverthrow Result ([55b522c](https://github.com/stocka-app/stocka-server/commit/55b522c6aad3394b4f699f539564c74e77c625f4))
* **auth-bc:** reset-password handler and controller use neverthrow Result ([57a4091](https://github.com/stocka-app/stocka-server/commit/57a4091dd782990be16976098bf00451b98ee654))
* **auth-bc:** sign-in handler and controller use neverthrow Result ([7c56c62](https://github.com/stocka-app/stocka-server/commit/7c56c62fdb9256bf8c8090024084a62cc8709151))
* **auth-bc:** sign-up handler and controller use neverthrow Result ([e3591c1](https://github.com/stocka-app/stocka-server/commit/e3591c1e39366197fe072bd907746719a1338650))
* **auth-bc:** simplify comments and improve readability in session and verification handlers ([d9138c2](https://github.com/stocka-app/stocka-server/commit/d9138c2383c94bf93174b79efc3857a752c7c806))
* **auth-bc:** verify-email handler and controller use neverthrow Result ([c430707](https://github.com/stocka-app/stocka-server/commit/c4307076c13bd9430cb960c347c887dc8d362bda))
* **auth-bc:** wrap SignUp and VerifyEmail handlers in UoW transactions ([8281812](https://github.com/stocka-app/stocka-server/commit/828181297832c1ccdd13f9dcaaf90be621c7dde6))
* **auth:** [STOC-245](https://austins-industries.atlassian.net/browse/STOC-245) — migrate SignInHandler to SignInSaga ([77ca814](https://github.com/stocka-app/stocka-server/commit/77ca814405dca1b7d0135d7f79dc755fd83e3f6d))
* **auth:** [STOC-252](https://austins-industries.atlassian.net/browse/STOC-252) — migrate ResetPasswordHandler to ResetPasswordSaga ([f03ded5](https://github.com/stocka-app/stocka-server/commit/f03ded505090b82e7636e958ad2a37d38ed3c8a3))
* **auth:** consolidate email sending to event handlers, fix double-send bug ([69fb1bf](https://github.com/stocka-app/stocka-server/commit/69fb1bf32f3df930ca5b55be2cf69cec41362046))
* **authentication:** migrate RefreshSessionHandler to RefreshSessionSaga ([eb196a1](https://github.com/stocka-app/stocka-server/commit/eb196a1bc0bf9df20c1313d871861fced3436c4c))
* **authentication:** rename auth bounded context to authentication ([6965935](https://github.com/stocka-app/stocka-server/commit/696593502ae97ff8f49856387ffd57efb2d6cd9a))
* **auth:** move rate limiting out of verify-email handler ([14a4046](https://github.com/stocka-app/stocka-server/commit/14a404665df9ee2c7b0eeead890b55c46803631b))
* **auth:** remove canVerify from EmailAlreadyExistsException ([93d2217](https://github.com/stocka-app/stocka-server/commit/93d2217d2d2de93bcd265b2ba4ad7bae72db8c65))
* **auth:** replace inline exception classes with dedicated exception imports ([8f52aec](https://github.com/stocka-app/stocka-server/commit/8f52aec0497320b00a8f078053181d13feb079a6))
* clean up imports and improve ESLint configuration for test files ([5a3e35b](https://github.com/stocka-app/stocka-server/commit/5a3e35b82a263e3189b64366c4f45f804934f698))
* **database:** [STOC-270](https://austins-industries.atlassian.net/browse/STOC-270) — migrate UUID v4 to v7 for time-ordered inserts ([f1c068e](https://github.com/stocka-app/stocka-server/commit/f1c068e6b69fb041f12eaf0d12f2ee418bc60c12))
* **database:** move migrations folder into core module ([fe3f1b0](https://github.com/stocka-app/stocka-server/commit/fe3f1b0e7d6b298fc2da5a3bf2f4bc819ac49ada))
* **database:** replace parseInt with Number.parseInt for consistency ([e5cb2f6](https://github.com/stocka-app/stocka-server/commit/e5cb2f67ae87b00ec5dcc51bd97bc67d4d0e67b4))
* improve null checks and enhance type safety across various modules ([4acebd6](https://github.com/stocka-app/stocka-server/commit/4acebd65434307a44e8da6831f7aa073cb512b50))
* **rate-limit:** use null instead of '[redacted]' for codeEntered ([c775a93](https://github.com/stocka-app/stocka-server/commit/c775a93fe8c41add8369c55a494158c83fd3adc3))
* remove barrel files and replace barrel imports with direct imports ([8744f16](https://github.com/stocka-app/stocka-server/commit/8744f169b4ea93c8fc252c5c2a2dfac5f46d187b))
* **shared:** rename integration events from auth to authentication ([d687654](https://github.com/stocka-app/stocka-server/commit/d687654248c984b27c867dc960f95f6c155947b9))
* **shared:** replace primitives with VOs in Aggregates and Entities ([ca1166c](https://github.com/stocka-app/stocka-server/commit/ca1166c0e8fa85df554c4fe1c4c828ba330a90a5))
* **shared:** rewrite MediatorService with typed user namespace ([70e1352](https://github.com/stocka-app/stocka-server/commit/70e1352285cc51894241d2e34778c21b10a80cc1))
* standardize UUID naming convention across the codebase ([0e22e4f](https://github.com/stocka-app/stocka-server/commit/0e22e4ffeeb44fd7109f18c91b88b35306605295))
* **test:** simplify rate-limit interceptor tests using lastValueFrom ([ce6dd0f](https://github.com/stocka-app/stocka-server/commit/ce6dd0f95559ef29706f8922985c8839bef7fd3b))
* **test:** update test imports to use explicit path aliases ([0b1c5a6](https://github.com/stocka-app/stocka-server/commit/0b1c5a60053a9953a560c17201a80decc2c5f7b8))
* update all source imports to use explicit path aliases ([1f47ce8](https://github.com/stocka-app/stocka-server/commit/1f47ce8864d2cc2ec724becf33fe2c68dd29557e))
* update path alias configuration for tsconfig and jest ([f9e5025](https://github.com/stocka-app/stocka-server/commit/f9e5025a99003b24ef181c006de3d4112fc3453f))
* update VerificationAttempt model and entity to allow nullable userUuid and email ([6dbe8af](https://github.com/stocka-app/stocka-server/commit/6dbe8af5deec38a1891fa1256fd9e5904bbad528))
* **user-bc:** apply neverthrow Result to all handlers ([36412e7](https://github.com/stocka-app/stocka-server/commit/36412e7cd1548ed3c12e3735ee655641527734db))
* **user-bc:** implement IUserView on UserAggregate ([42efec4](https://github.com/stocka-app/stocka-server/commit/42efec47f339353803262eb227c191a5940e15ba))
* **user-bc:** remove infrastructure dependency from domain contract ([d7bf240](https://github.com/stocka-app/stocka-server/commit/d7bf24091b2ec53ca384219cbcec058d7138f4fe))
* **user-bc:** rename UserModel to UserAggregate ([4f31621](https://github.com/stocka-app/stocka-server/commit/4f31621550f8ed5c06f51bad43d9ae4950ec0e7c))
* **user-bc:** update facade to unwrap Result types from command bus ([f22894d](https://github.com/stocka-app/stocka-server/commit/f22894d67c7740834bd1b716e8f13cfe44b13847))
* **user:** [STOC-271](https://austins-industries.atlassian.net/browse/STOC-271) — cleanup leftover social-account entity and fix GetMeController email stub ([d2f543f](https://github.com/stocka-app/stocka-server/commit/d2f543ff7c1d95ca6720a88b99bffa6007b77f79))
* **user:** [STOC-271](https://austins-industries.atlassian.net/browse/STOC-271) — restructure UserAggregate as pure anchor with CredentialAccountModel ([c5d7c73](https://github.com/stocka-app/stocka-server/commit/c5d7c736ec2dfc9867fd3d6495f13a46b7a2d87f))

### 🔒 Security

* **auth:** sanitize sensitive data from Auth BC logs [STOC-161] ([2dfd127](https://github.com/stocka-app/stocka-server/commit/2dfd1276fe9ce480c906bbe5e79029ac1a2b92b9))

### 📚 Documentation

* **env:** fix DB_PORT in .env.example to match Docker dev setup (STOC-195) ([524fc86](https://github.com/stocka-app/stocka-server/commit/524fc8671df1d7193a2c54872509bc46065a0593))
* **project:** add README and domain events planning documentation ([ecfb758](https://github.com/stocka-app/stocka-server/commit/ecfb758b82caf33fc33461f985ad37f9e0d72654))

### 🧹 Chores

* add release scripts and dependencies for versioning and changelog generation ([6010e97](https://github.com/stocka-app/stocka-server/commit/6010e973023ec942db1c5117352a12a17ff1634e))
* **auth-bc:** add Auth BC Value Objects ([bca1ffd](https://github.com/stocka-app/stocka-server/commit/bca1ffdb233bebc7268f0a232f6b1da7c8342627))
* **coverage:** [STOC-268](https://austins-industries.atlassian.net/browse/STOC-268) — add unit+e2e coverage merge via nyc ([1fc4e9f](https://github.com/stocka-app/stocka-server/commit/1fc4e9f9182f5e0897b4e0f5598c178a85c822c4))
* **deps:** add @nestjs/throttler for rate limiting ([32eaddf](https://github.com/stocka-app/stocka-server/commit/32eaddfc135aaccc76a1ccf02e64fcfd269ae9e4))
* **deps:** add passport-microsoft for Microsoft OAuth support ([bab3ba4](https://github.com/stocka-app/stocka-server/commit/bab3ba46cfebb0d4eb5fa21d31c15d03c180af11))
* **docker:** add Docker configuration for development and production ([09643bb](https://github.com/stocka-app/stocka-server/commit/09643bbcb44e229a6e606ed9c7bd65ffdb5d9e13))
* **docker:** change PostgreSQL port to 5434 ([437c130](https://github.com/stocka-app/stocka-server/commit/437c1300d4f68f4a4df4eb3ef576d442b34f7d43))
* **infra:** rewrite health endpoint to match AC response format\n\nReplace Terminus-based health check with custom DataSource.query('SELECT 1')\nso the response matches the specified contract:\n  200 → { status: \"ok\", db: \"connected\" }\n  503 → { status: \"error\", db: \"disconnected\" }\n\nIncludes unit tests for connected, unreachable, and timeout scenarios.\n\nRefs: STOC-247\nEpic: STOC-231\nSprint: Sprint 1 | Fundamentos" ([a38921c](https://github.com/stocka-app/stocka-server/commit/a38921c28b24e74692c9ac06d251fa3a96762285))
* **project:** initialize NestJS project scaffolding ([1df1933](https://github.com/stocka-app/stocka-server/commit/1df19335827094ba092851d7f6318519481d7aab))
* **shared:** add shared Value Objects for VO refactor ([9f35619](https://github.com/stocka-app/stocka-server/commit/9f35619ebf154cd5961945cbdf5b386b482a5e1e))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add config, aliases, migration for Tenant BC ([7fbb617](https://github.com/stocka-app/stocka-server/commit/7fbb617955ce498e39cf051d832392bbf9f01d1b))
* **test-config:** update lint, env and test suites for authentication rename ([815b31e](https://github.com/stocka-app/stocka-server/commit/815b31e5c9ca65aaa0891f504aac9278d1ee8177))
* update .gitignore to include githooks and CLAUDE.md ([e7bc673](https://github.com/stocka-app/stocka-server/commit/e7bc673d1a835e72c4378f19d74e07772f52efc7))
* **user-bc:** add User BC Value Objects ([e283dd7](https://github.com/stocka-app/stocka-server/commit/e283dd70e85cbc33be336cc587d79116f13c4312))

### ✅ Tests

* **auth-bc:** update all tests for typed mediator pattern ([94e1dfd](https://github.com/stocka-app/stocka-server/commit/94e1dfd2c7e5687ca50482a2a0e1ce357b0a1726))
* **auth-bc:** update handler specs to assert on neverthrow Result ([4a6fd6f](https://github.com/stocka-app/stocka-server/commit/4a6fd6f5c63266d528329f9db4719f573aa96d87))
* **auth:** [STOC-245](https://austins-industries.atlassian.net/browse/STOC-245) — add unit + e2e tests for SignInSaga ([c59f8c3](https://github.com/stocka-app/stocka-server/commit/c59f8c38560434eb22900c0dba756b499ebdf00c))
* **auth:** [STOC-252](https://austins-industries.atlassian.net/browse/STOC-252) — add unit and e2e tests for ResetPasswordSaga ([2c4f38c](https://github.com/stocka-app/stocka-server/commit/2c4f38c55de8bbbb0441a43e326e0e59267dd457))
* **auth:** [STOC-268](https://austins-industries.atlassian.net/browse/STOC-268) — add missing e2e specs + fix @HttpCode on POST endpoints ([29e9280](https://github.com/stocka-app/stocka-server/commit/29e9280d9a2e06689f72521a03fcc4f2ec049f7d))
* **auth:** add verify-email handler regression tests ([b5dfc28](https://github.com/stocka-app/stocka-server/commit/b5dfc2814022e3a65a62a05da17dcf61ab04634f))
* **authentication:** [STOC-253](https://austins-industries.atlassian.net/browse/STOC-253) — add unit + e2e tests for SocialSignInSaga ([a89a317](https://github.com/stocka-app/stocka-server/commit/a89a317ace32c048ee9e9cfb3368e4f70810c554))
* **authentication:** add unit + e2e tests for RefreshSessionSaga ([558854a](https://github.com/stocka-app/stocka-server/commit/558854a7eba932a17dc356e319db8a7d7be7f2cc))
* **common:** add unit tests for rate limiting guard and interceptor ([0653985](https://github.com/stocka-app/stocka-server/commit/0653985eafbba765b149f13a175820caa0f503ae))
* **coverage:** [STOC-268](https://austins-industries.atlassian.net/browse/STOC-268) — achieve 100% MERGED combined coverage (unit + e2e) ([e12fa31](https://github.com/stocka-app/stocka-server/commit/e12fa31ee8bcea37a7baa15e8a6504505b607cea))
* **database:** [STOC-270](https://austins-industries.atlassian.net/browse/STOC-270) — cover released-QR defensive paths in TypeOrmUnitOfWork ([8e9466f](https://github.com/stocka-app/stocka-server/commit/8e9466fa3300495908a53947145e28845c92172b))
* **e2e:** [STOC-278](https://austins-industries.atlassian.net/browse/STOC-278) — test suite optimization + 100% combined coverage ([755a45a](https://github.com/stocka-app/stocka-server/commit/755a45aec0dc6f49ecdd9edef1db8658116d63a7))
* **e2e:** add rate limiting e2e tests ([6e2907c](https://github.com/stocka-app/stocka-server/commit/6e2907c6a3b2baa2b6c7f932f98275fef426d9dc))
* **env:** add validation tests for environment configuration ([a8f9b0e](https://github.com/stocka-app/stocka-server/commit/a8f9b0eb9ad30b7e6f6ca0b627a4a1205b4afbd4))
* **helpers:** extend UserMother with status and blocking support ([21fdb7c](https://github.com/stocka-app/stocka-server/commit/21fdb7c01f5593590a2e5803ee20a6e0c5fd7f86))
* **infra:** [STOC-268](https://austins-industries.atlassian.net/browse/STOC-268) — BE e2e coverage — repos, UoW, and e2e suite fixes ([fab00b9](https://github.com/stocka-app/stocka-server/commit/fab00b9c52c1d8b4af3ff94b93294bb76be884e7))
* **infra:** add e2e test for health check endpoint ([c1655fc](https://github.com/stocka-app/stocka-server/commit/c1655fc12b450a3298286a5a16805f14426088f4))
* **rate-limit:** fix async timing in interceptor tests ([bde8e4d](https://github.com/stocka-app/stocka-server/commit/bde8e4df1889f38f42b62a6ccc1912f37e5daf63))
* **saga:** add unit tests for saga base and sign-up flow ([f36b0f7](https://github.com/stocka-app/stocka-server/commit/f36b0f793f4bde560ca9861057bd5029851f14f7))
* **shared:** add unit tests for withRetry, ProcessManager, and UoW handlers ([e87539a](https://github.com/stocka-app/stocka-server/commit/e87539a271760b3e307a1d5b192bb2025219e39a))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add 121 unit tests for Tenant BC ([f535f1b](https://github.com/stocka-app/stocka-server/commit/f535f1b251d67998454ceea0bfd92d7523bfa40c))
* **tenant-bc:** [STOC-254](https://austins-industries.atlassian.net/browse/STOC-254) — add edge-case tests for handler catch branches ([ddb9a3a](https://github.com/stocka-app/stocka-server/commit/ddb9a3a969ee2af52cf87e43d858311936e2dff9))
* **unit:** add unit tests and test helpers ([cfbfecc](https://github.com/stocka-app/stocka-server/commit/cfbfecc08af73e3e3f1527467c996b6872e1388d))
* **user-bc:** add unit tests for all refactored Result-returning handlers ([e8256ca](https://github.com/stocka-app/stocka-server/commit/e8256caa3da138befd4e99dc6627e74b503eebac))
* **user:** [STOC-271](https://austins-industries.atlassian.net/browse/STOC-271) — update all unit + e2e specs for A-03 UserAggregate anchor refactor ([103cba0](https://github.com/stocka-app/stocka-server/commit/103cba0fa07523ab8c72f55296f739967ea02db8))
* **user:** add unit tests for FindUserByUUIDHandler to validate user retrieval and error handling ([1424f85](https://github.com/stocka-app/stocka-server/commit/1424f85186eb684f583d6994e1d7a8a405a608e2))

### 🎨 Styles

* apply eslint and prettier formatting fixes ([e56a4c1](https://github.com/stocka-app/stocka-server/commit/e56a4c17e4e8913ff76e9660e6cbef72e1081df6))

### 👷 CI

* **github:** add GitHub Actions workflow ([65836e2](https://github.com/stocka-app/stocka-server/commit/65836e22929d689c5acb5bb7fb984d6f1564f3f7))
* **migrations:** add migration step to CI pipeline\n\nRun TypeORM migrations before lint/test in the CI pipeline.\nMigration failures now block the build — broken migrations cannot reach production.\nGitHub Actions exits non-zero on migration errors by default.\n\nRefs: STOC-247\nEpic: STOC-231\nSprint: Sprint 1 | Fundamentos" ([3cbe127](https://github.com/stocka-app/stocka-server/commit/3cbe1275f386c603450f2b1bed43fbe5168b67d8))
