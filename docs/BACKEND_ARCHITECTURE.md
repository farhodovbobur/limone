# Backend Architecture — Folder Structure & Conventions

> **Status:** Locked — do not revisit without a documented reason
> **Last updated:** 2026-07-15
> **Scope:** NestJS API (currently repo root `src/`; becomes `apps/api/src/` in the Nx restructure — the inner layout does not change)
> **Related:** `../BUSINESS_PLAN.md` §9, `./PHASE_0_FOUNDATION.md`
> **Note:** This English document is canonical; `BACKEND_ARCHITECTURE_UZ.md` is a translation.

---

## 1. The three building blocks

Every domain feature is built from three classes wired by one module:

- **Module** — the box: declares what the feature contains and exposes.
- **Controller** — HTTP layer only: routes, request in, response out. **Thin.**
- **Service** — business logic: rules, calculations, repository calls. **Fat.**

The app is a tree of feature modules under the root `AppModule`.

Request lifecycle (where cross-cutting code hooks in):

```
Request → Middleware → Guards → Interceptors (pre) → Pipes (validation)
        → Controller → Service → Interceptors (post) → Exception Filters → Response
```

---

## 2. Locked folder structure

```
src/
├── main.ts                          # bootstrap: /api prefix, global pipes, CORS
├── app.module.ts                    # root module — imports only, no logic
│
├── config/                          # env validation (Zod) + typeorm.config.ts
│   ├── env.validation.ts            #   fail-fast at startup if env is missing
│   └── typeorm.config.ts            #   buildDataSourceOptions() — single source
│                                    #   for app.module AND database/data-source.ts
│
├── shared/                          # cross-cutting ONLY (used by 2+ modules)
│   ├── enums/                       #   Role, statuses (→ libs/shared in Nx later)
│   ├── decorators/                  #   @Roles(), @CurrentUser()
│   ├── guards/                      #   RolesGuard (authorization matrix enforcer)
│   ├── filters/                     #   global exception format
│   └── interceptors/
│
├── database/
│   ├── data-source.ts               # TypeORM CLI entry (migrations)
│   ├── migrations/                  # generated + hand-written migrations
│   └── seeds/                       # first admin, reference data
│
├── auth/                            # feature module (Phase 0)
│   ├── auth.module.ts
│   ├── auth.controller.ts           # login, refresh, logout, me, change-password
│   ├── auth.service.ts              # token issue/rotate/revoke logic
│   ├── auth.service.spec.ts         # tests live NEXT TO the code they test
│   ├── strategies/                  # Passport JWT strategy
│   ├── guards/                      # JwtAuthGuard (feature-specific guard)
│   ├── dto/                         # request/response DTOs (Zod schemas)
│   └── entities/refresh-token.entity.ts
│
├── users/                           # feature module (Phase 0)
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.service.spec.ts
│   ├── dto/                         # create-user.dto.ts, update-user.dto.ts
│   └── entities/user.entity.ts
│
└── <feature>/                       # Phase 1+: units/, materials/, suppliers/,
                                     # receipts/, stocktakes/ … same shape
```

---

## 3. Rules

1. **Feature-first.** A file belongs to its feature module (`user.entity.ts`
   lives in `users/entities/`), never in type-based global folders
   ("all entities in one folder" is forbidden).
2. **`shared/` is guarded.** Only genuinely cross-cutting code used by 2+
   modules. It must never become a dumping ground; if something is used by one
   module, it lives in that module.
3. **Thin controllers, fat services.** No business logic in controllers —
   services are testable without HTTP context.
4. **Tests are colocated:** `x.service.spec.ts` sits next to `x.service.ts`.
   Only e2e tests live in the top-level `test/` folder.
5. **Feature-specific guards/pipes stay in their feature** (e.g. `auth/guards/`);
   only matrix-wide ones (RolesGuard) live in `shared/guards/`.
6. **`config/` owns env access.** Modules read configuration through
   `ConfigService`; raw `process.env` is allowed only at boundaries that run
   outside Nest (`database/data-source.ts`).
7. **Naming:** `<name>.<kind>.ts` — `users.controller.ts`, `login.dto.ts`,
   `user.entity.ts`, `roles.guard.ts` (NestJS CLI convention).
8. **Nx future:** this whole `src/` moves verbatim to `apps/api/src/`;
   `shared/enums` + DTO schemas graduate to `libs/shared` when the admin
   frontend appears (BUSINESS_PLAN §9.2).

---

## 4. Laravel → NestJS mental map

| Laravel | NestJS | Note |
|---|---|---|
| Controller | Controller | decorators for routing: `@Get(':id')` |
| Service / Action class | Service (Provider) | optional habit in Laravel, architectural standard in Nest |
| FormRequest | DTO + Pipe | ours: Zod via nestjs-zod |
| Middleware | Middleware + Guard + Interceptor | one Laravel concept split into three hooks |
| Policy / Gate | Guard | `@Roles()` + RolesGuard |
| Exception Handler | Exception Filter | central error format |
| Eloquent Model | Entity + Repository | Data Mapper: data and operations separated |
| ServiceProvider | Module + DI | DI is automatic via constructor injection |
