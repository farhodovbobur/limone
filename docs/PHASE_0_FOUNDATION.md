# Phase 0 — Foundation (Identity & Access)

> **Status:** Design locked, not yet built
> **Last updated:** 2026-07-05
> **Stack:** Nx monorepo (`apps/api`) · NestJS 11 · PostgreSQL 18 · TypeORM 1.0 · TypeScript 5.9 · Node 24 LTS · JWT · Zod (`nestjs-zod`)
> **Related:** `../BUSINESS_PLAN.md` (§9 repo structure & API contract)
> **Note:** This English document is canonical; `PHASE_0_FOUNDATION_UZ.md` is a translation.

---

## 1. Goal

Establish the identity and access foundation that every later phase stands on: **staff authentication, the `users` table, roles, and role-based authorization** — plus the application skeleton (config, validation, error handling, CORS).

Phase 0 has no end-user business feature; its value is that nothing else can be built securely without it.

---

## 2. Scope

**In scope**
- `users` table (staff accounts only)
- Single-role model via an `enum` column
- Authentication: username + password login; **short-lived access token + sliding refresh token** (Variant B, §7)
- Authorization: role-based guards
- Admin-driven account management (create, update, deactivate, reset password)
- First admin via seed script
- App skeleton: global validation (**Zod via `nestjs-zod`, schemas in `libs/shared`** — see `BUSINESS_PLAN.md` §9.2), structured error format, logging, CORS, `/api` prefix, config via `.env`

**Out of scope (non-goals)**
- Customer accounts → Phase 5/6 (separate `customers` table)
- Multiple roles per user / RBAC permissions table → not now (single enum, see §3)
- Dynamic, admin-created roles → roles are a fixed, seeded enum
- Worker wage/skill profile data → Phase 4 (separate `employee` table)
- Units of measure & category reference data → deferred to their owning phases (units with Material warehouse in Phase 1, etc.). *This refines the earlier note in `BUSINESS_PLAN.md` §6.*
- Public/self-registration for staff → staff accounts are created by an admin

---

## 3. Locked decisions

| # | Decision | Rationale |
|---|----------|-----------|
| Q1 | Login by **`username`** (primary, unique, required). `phone` and `email` are **nullable**. | Workshop staff reliably have a username, not always email; phone optional as contact. |
| Q1 | Name stored as **`first_name` + `last_name`** (not a single field). | Cleaner for sorting, display, and future formatting. |
| Q2 | **One role per user**, stored as an `enum` column. | Small workshop; each person has one job. Simpler than M2M; can migrate later if needed (§13). |
| Q3 | **Staff and customers are separate tables**, linked later via `customers.staff_user_id`. | Different auth flows, different attributes; overlap handled by a link FK. |
| Q4 | `users` stays **auth-only**; worker-specific data lives in a separate table in Phase 4. | Keeps `users` clean; wage/skill fields don't belong on every staff account. |
| Q5 | **Sliding session (Variant B): short access token + refresh token.** Active user stays logged in; inactive for `REFRESH_TOKEN_TTL` (2h) → logged out. | Matches "active = unlimited, idle = 2h"; enables session revocation (deactivated staff are kicked out). |

---

## 4. `users` table (final structure)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | int (serial) | PK | |
| `username` | varchar(50) | **unique, not null** | Login identifier |
| `password_hash` | varchar | not null, **not selected by default** | bcrypt; never returned in API responses |
| `first_name` | varchar(100) | not null | |
| `last_name` | varchar(100) | not null | |
| `phone` | varchar(20) | nullable, unique | Stored normalized, E.164 (e.g. `+99890...`) |
| `email` | varchar(150) | nullable, unique | Optional |
| `role` | enum | not null | See §5 |
| `is_active` | boolean | not null, default `true` | Deactivate instead of deleting |
| `created_at` | timestamptz | not null, default now | |
| `updated_at` | timestamptz | not null, auto | |

Notes:
- **Nullable + unique** is fine in PostgreSQL — multiple `NULL`s are allowed, so several users without phone/email coexist.
- **No hard delete.** Accounts are deactivated (`is_active = false`) to preserve audit and future wage history.
- `password_hash` uses `select: false` in TypeORM and is only loaded explicitly during login.

---

## 5. Roles

A fixed, seeded enum. Five roles:

| Code | Name (UZ) | Responsibility |
|------|-----------|----------------|
| `admin` | Admin / Ega | Full access, configuration, reports |
| `warehouse_keeper` | Omborchi | Material & finished-goods IN/OUT, stock |
| `workshop_manager` | Sex boshlig'i | Production orders, task assignment, status |
| `worker` | Tikuvchi | Sees own assigned tasks, updates their status |
| `sales` | Sotuvchi | Orders, customers, stock lookup |

Role is assigned/changed **only by an admin** when creating or editing a user.

---

## 6. Authorization matrix (target)

Most modules belong to later phases; this is the **target access map**, refined per phase as modules ship. `R` = read, `W` = write/manage, `—` = no access, `own` = only own records.

| Module / Role | admin | warehouse_keeper | workshop_manager | worker | sales |
|---------------|:-----:|:----------------:|:----------------:|:------:|:-----:|
| User management | RW | — | — | — | — |
| Material warehouse | RW | RW | R | — | — |
| Finished-goods warehouse | RW | RW | R | — | R |
| Catalog (models/variants) | RW | R | R | — | R |
| BOM (norma) | RW | — | RW | — | — |
| Production orders | RW | — | RW | own | — |
| Wages | RW | — | R | own | — |
| Sales / Orders | RW | — | — | — | RW |
| Customers | RW | — | — | — | RW |
| Reports / statistics | RW | R (inventory) | R (production) | — | R (sales) |

In Phase 0 the only protected resource is **User management (admin only)**; the rest of the matrix is the contract that later phases implement.

---

## 7. Authentication design

**Account creation** — no self-registration for staff. An admin creates an account (username, first/last name, role, temporary password). Optional but recommended: force password change on first login.

**Token model (Variant B — sliding session).** Two tokens:

- **Access token** — short-lived (`ACCESS_TOKEN_TTL`, e.g. `15m`), sent on every API request as `Authorization: Bearer`. Signed with `JWT_ACCESS_SECRET`.
- **Refresh token** — represents the session; its lifetime is the **inactivity window** (`REFRESH_TOKEN_TTL` = `2h`). Signed with `JWT_REFRESH_SECRET` and **persisted server-side** (hashed) for rotation and revocation.

**Why two tokens:** while the user is active, the expiring access token is silently exchanged for a new one via the refresh token, and each exchange resets the 2h window — so an active user **stays logged in indefinitely**. If the user is idle for 2h, the refresh token expires and the next refresh fails → **logout**.

**Access token payload**
```json
{ "sub": <userId>, "username": "<username>", "role": "<role>" }
```

**Login** — `POST /api/auth/login` `{ username, password }` → `{ accessToken, refreshToken, user }` (no `password_hash`). A refresh-token row is created with `expires_at = now + REFRESH_TOKEN_TTL`.

**Refresh** — `POST /api/auth/refresh` `{ refreshToken }`. Validates it (exists, not revoked, not expired), then **rotates**: revokes the old token, issues a new access + new refresh (new 2h expiry). Returns both.

**Logout** — `POST /api/auth/logout` revokes the current refresh token.

**Passwords** — hashed with bcrypt. A user can change their own password; an admin can reset another user's. Changing/resetting a password revokes that user's refresh tokens.

**First admin** — created by a seed script (`npm run seed`), e.g. `admin` / temporary password, role `admin`. Password must be changed after first login.

---

## 8. API endpoints (Phase 0)

All under `/api`.

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| POST | `/auth/login` | Public | Log in, returns access + refresh tokens |
| POST | `/auth/refresh` | Public (valid refresh token) | Rotate: new access + refresh |
| POST | `/auth/logout` | Authenticated | Revoke current refresh token |
| GET | `/auth/me` | Authenticated | Current user profile |
| POST | `/auth/change-password` | Authenticated | Change own password (revokes refresh tokens) |
| POST | `/users` | Admin | Create staff account |
| GET | `/users` | Admin | List staff |
| GET | `/users/:id` | Admin | One staff member |
| PATCH | `/users/:id` | Admin | Update profile / role / `is_active` |
| POST | `/users/:id/reset-password` | Admin | Reset a user's password |

> No `DELETE` — deactivation is done via `PATCH … { is_active: false }`.

---

## 9. Data model sketch

**Role enum** — defined once in `libs/shared` and imported by both `apps/api` and `apps/admin` (never duplicated):
```
ADMIN = 'admin'
WAREHOUSE_KEEPER = 'warehouse_keeper'
WORKSHOP_MANAGER = 'workshop_manager'
WORKER = 'worker'
SALES = 'sales'
```

**DDL (illustrative)**
```sql
CREATE TYPE user_role AS ENUM
  ('admin','warehouse_keeper','workshop_manager','worker','sales');

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR      NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  UNIQUE,
  email         VARCHAR(150) UNIQUE,
  role          user_role    NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Refresh tokens (Variant B): stored hashed, rotated, revocable.
CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR     NOT NULL,          -- hash of the refresh token, never the raw value
  expires_at  TIMESTAMPTZ NOT NULL,          -- now + REFRESH_TOKEN_TTL (sliding on each refresh)
  revoked_at  TIMESTAMPTZ,                   -- set when rotated/logged out/revoked
  replaced_by INT REFERENCES refresh_tokens(id), -- rotation chain (reuse detection)
  user_agent  VARCHAR,                       -- optional: device/session info
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

In TypeORM this maps to a `User` entity (`@Column({ type: 'enum', enum: Role })` for `role`, `@Column({ select: false })` for `password_hash`) and a `RefreshToken` entity with a `ManyToOne` to `User`.

---

## 10. Security considerations

- bcrypt for password hashing; `password_hash` never serialized to responses.
- Only `admin` can create accounts or change roles — there is no public staff registration endpoint.
- Minimum password length enforced (e.g. ≥ 8 chars); recommend forced change of seeded/temp passwords.
- Global **`ZodValidationPipe`** (`nestjs-zod`); request schemas are strict objects, so unknown fields are rejected. The same schemas validate the admin UI forms (`libs/shared`).
- JWT secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) come from `.env`; never committed. Separate secrets for access vs refresh.
- Deactivated users (`is_active = false`) are rejected at login.
- **Refresh tokens are stored hashed** (never raw) and **rotated** on every refresh; the old one is revoked.
- **Reuse detection:** if an already-revoked refresh token is presented (possible theft), revoke all of that user's refresh tokens.
- **Revocation on deactivation:** setting `is_active = false` revokes the user's refresh tokens → they cannot refresh and are logged out within one access-token TTL (≤ 15m). For immediate cut-off, the guard may additionally check `is_active`.

---

## 11. Acceptance criteria (Definition of Done)

- [ ] Seeded admin can log in with username + password.
- [ ] Admin can create a staff user with a chosen role.
- [ ] The created user can log in and receives an **access + refresh token**.
- [ ] An expired access token is transparently renewed via `/auth/refresh` (active session continues).
- [ ] After **2h of inactivity** the refresh fails and the user is logged out.
- [ ] `/auth/refresh` **rotates** the refresh token (old one no longer works).
- [ ] `GET /auth/me` returns the current user without `password_hash`.
- [ ] A role-protected endpoint returns **403** for the wrong role and **200** for the right one.
- [ ] Deactivated user cannot log in, and an active session's refresh is revoked on deactivation.
- [ ] `password_hash` never appears in any API response.
- [ ] Unknown request fields are rejected by validation.

---

## 12. Relation to the existing code

**This repo contains no prior auth or domain code** — only a bare `nest new` scaffold at the root. An earlier e-commerce skeleton (email login, Products/Categories CRUD) referenced by older revisions of these docs lives outside this repo and is **not ported**; this design supersedes it entirely.

Implementation therefore starts clean:

1. Restructure the scaffold into the Nx workspace (`apps/api`, `apps/admin`, `libs/shared`) per `BUSINESS_PLAN.md` §9.
2. Build Phase 0 inside `apps/api` exactly as specified here: username login, access + refresh tokens (Variant B), `refresh_tokens` table, admin-created accounts only (no public register), env vars `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`.
3. Domain modules (materials, models, BOM, production, orders) are modeled from Phase 1 onward — no generic Products/Categories CRUD.

---

## 13. Future evolution

- **Multiple roles needed?** Migrate the `role` enum to a `roles` table + `user_roles` (M2M). Isolated migration; guards change from "has role" to "has any required role".
- **Granular permissions?** Add a `permissions` table and map roles → permissions in the DB instead of in code.
- **Unified identity with customers (SSO)?** Move to a party/partner model (one person record, multiple personas). Only if overlap grows large.

---

## 14. Next step

Phase 1's detailed design now exists: **`PHASE_1_MATERIAL_WAREHOUSE.md`** (materials, suppliers, units, multi-currency ledger, stocktake). After both designs are approved: scaffold the Nx workspace, then implement Phase 0 + Phase 1 together as the first usable slice, with the engineering standards of `BUSINESS_PLAN.md` §7.
