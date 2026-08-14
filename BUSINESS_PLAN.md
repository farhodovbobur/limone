# Business & Product Plan — LIMONÉ Garment Workshop ERP

> **Status:** Planning (business is pre-launch; no implementation until plans are approved)
> **Last updated:** 2026-07-05
> **Stack:** Nx monorepo (npm) · Backend — NestJS 11 · Frontend — React 19 (Vite) · DB — PostgreSQL 18 + TypeORM 1.0 · Node 24 LTS
> **Language policy:** This English document is **canonical**; `*_UZ.md` files are translations, regenerated after every substantial change.

---

## 1. What this system is (and is not)

This is **not** a classic e-commerce platform. It is an **ERP + light MES (Manufacturing Execution System)** for a clothing business that does two things:

1. **Sells ready-made clothes** (make-to-stock retail).
2. **Tailors custom clothes** (make-to-order) in its own **workshop (sex)**.

The **admin panel is the core product.** The public online store (e-commerce) is a **secondary, connected channel** — built last, but the data model must be ready for it from day one.

Naming this correctly matters: the priority is internal operations (inventory, production, orders), not a customer-facing shop.

---

## 2. The core flow (the spine)

Everything in the system hangs off one chain:

```
Material purchase (IN) → Material warehouse → Issue to workshop → Production
   → Finished garment → Finished-goods warehouse → Sale / Order (OUT)
```

The two order types are two triggers on the **same** chain:

- **Ready-made order** → fulfilled from finished-goods stock (make-to-stock).
- **Custom order** → creates a production task with a **deadline** and is sent to the workshop (make-to-order).

---

## 3. Central concept: BOM ("norma")

The single most important entity is the **Bill of Materials (norma)** — a recipe per garment model: how much fabric, how many buttons, how much thread, etc.

Without it, "the workshop consumes material" is guesswork and stock drifts within weeks. With it:

- Material is **automatically deducted** when production completes.
- We compute the **true unit cost** of each garment (material + labor) → enabling correct pricing and margin analysis.

**The value of the whole system depends on modeling the norma correctly.**

---

## 4. Key design decisions

These were chosen deliberately and shape the data model. Decisions 4.7–4.11 were locked in the July 2026 planning review.

**4.1 Material consumption — standard norma + actual.**
Model consumption by norma (recipe-based, auto-deducted), **but also record actual consumption**. The gap between planned and actual surfaces waste and shrinkage — a real workshop problem.

**4.2 Wages — start flat per garment, evolve to per-operation.**
Garment workshops are almost always **piece-rate per operation** (cutter, sewer, presser each paid per piece per operation). Full routing is complex, so the MVP starts with a flat rate per garment, and the model is designed so per-operation routing can be added without a rewrite.

**4.3 Variants are mandatory — model + size + color = SKU.**
Even with no marketplace, a clothing warehouse is meaningless without size/color tracking. Finished goods are tracked at SKU level; raw materials are tracked by unit of measure (meter, kg, piece, roll).

**4.4 Money is tracked as ledgers, not single fields.**
Customer payments on orders are a **`Payment` ledger** (multiple partial payments, possibly in different currencies) — not a single `advancePaid` number. This gives customer-debt reporting for free. Supplier debt (credit purchases) is **deferred** (see §12 Open questions), but every purchase document stores `totalAmount` and `paidAmount` separately from day one, so adding payables later needs no migration. Full accounting/cashbox can come later.

**4.5 Channel-agnostic Order model.**
An order is the same whether entered by an admin or placed online by a customer. The online channel is a *source*, not a separate model. This avoids rewriting orders when e-commerce is added.

**4.6 Ledger pattern for all stock.**
Every stock change (material or finished goods) is an immutable transaction (IN/OUT/**ADJUSTMENT**, quantity, unit cost, reference, timestamp). Current stock is derived/cached from the ledger. This gives **statistics, audit trail, and cost history for free** — and is why statistics is not a separate phase. `ADJUSTMENT` entries come from **stocktakes (inventarizatsiya)**: counted vs. system quantity, difference written to the ledger with a reason.

**4.7 Full multi-currency with frozen dual values.**
Materials are often bought in USD, sales and wages are in UZS. Every money value in the system uses one **Money pattern**, sealed at transaction time:

```
{ currency (UZS|USD), amount, rateUzsPerUsd (rate on that date),
  uzsValue, usdValue }   ← both equivalents frozen when the row is written
```

- Reports and dashboards can be viewed in **UZS or USD via a switcher**; the switcher only selects which frozen column to sum.
- **No retroactive revaluation** — historical rows never change when the rate changes.
- Exchange rates: entered manually by an admin and/or fetched from the **CBU (Central Bank of Uzbekistan) API**; stored in an `ExchangeRate` table (one rate per date).

**4.8 Costing method — weighted average.**
When material leaves the warehouse (issued to production), its unit cost is the **weighted average** of what is currently in stock, recomputed after every IN. The average is maintained **in parallel in UZS and USD** from the frozen values (consequence of 4.7). FIFO/batch tracking is explicitly out of scope for now.

**4.9 Units of measure — dimensions + per-material conversion.**
- Every unit belongs to a **dimension**: length (m, cm), mass (kg, g), count (piece, pair), area (m²).
- **Within a dimension**, conversion is global and fixed (kg↔g, m↔cm).
- **Across dimensions** (e.g. kg→meter for knit fabric), conversion uses a **per-material factor** (e.g. *this* fabric: 1 kg = 3.2 m — depends on fabric density/width, so it cannot be global).
- Each material has one **canonical unit**; the ledger always stores quantities in it. The originally entered quantity + unit are preserved for audit.

**4.10 Production output has quality grades.**
When a production order completes, the produced quantity is split into **grade A (good)** and **grade B (defective / brak)**. Both enter finished-goods stock, brak with its own grade flag — it can be sold at a discount, reworked, or written off. Brak cost shows up in statistics as **quality loss**. Defects are never silently ignored: they consumed real material.

**4.11 Time policy — store UTC, display business time.**
All timestamps are stored as `timestamptz` (UTC — the single absolute truth; integrations, logs, and JWT lifetimes align with it). The UI shows **business time (`Asia/Tashkent`) to every user regardless of their location** — a manager viewing from abroad sees the same 14:00 the workshop reported (single-site ERP policy, not viewer-local rendering). All daily/period aggregations group by the **business-timezone day**: `date(ts AT TIME ZONE 'Asia/Tashkent')` — otherwise evening operations (after 19:00 Tashkent) leak into the next UTC day. The zone lives in one config value (`APP_TIMEZONE`).

---

## 5. User roles

| Role | Responsibility |
|------|----------------|
| Admin / Owner | Full access, configuration, reports |
| Warehouse keeper (omborchi) | Material & finished-goods IN/OUT, stocktakes |
| Workshop manager (sex boshlig'i) | Production orders, task assignment, status |
| Worker (tikuvchi) | Sees assigned tasks, marks progress — **on a phone** (see §9, worker UX) |
| Sales | Creates/confirms orders, customers |

---

## 6. Phased roadmap (bottom-up; each phase is independently usable)

### Phase 0 — Foundation
Auth, roles (admin, warehouse keeper, workshop manager, worker, sales), app skeleton, shared UI shell. Detailed design: `docs/PHASE_0_FOUNDATION.md`.
*Deliverable:* login + role-based access; nothing to "use" yet but everything stands on it.

### Phase 1 — Material warehouse
Units of measure, exchange rates, raw-material catalog, suppliers, material **IN** (purchase receipts with cost, currency, total/paid) and **OUT**, current stock, weighted-average cost, low-stock alerts, **stocktake → ADJUSTMENT**. Detailed design: `docs/PHASE_1_MATERIAL_WAREHOUSE.md`.
*Deliverable:* the warehouse keeper starts using it immediately.

### Phase 2 — Catalog + finished-goods warehouse
Garment models, variants (size/color = SKU), finished-goods **IN/OUT/stock** with **quality grades (A/brak)**, finished-goods stocktake. Finished goods can enter either via production (Phase 3) or by direct purchase.
*Deliverable:* full clothing inventory control; the foundation for sales.

### Phase 3 — BOM (norma) + Production
Per-model norma, production orders (work orders), task assignment to the workshop, status pipeline (new → cutting → sewing → done → received), material consumption by norma (planned vs actual), completion split into **A / brak** → finished-goods IN.
*Deliverable:* the heart of the system — production tracking and accurate material consumption.

### Phase 4 — Wages
Wage rates, automatic calculation from completed production (flat per garment first; per-operation later), payroll per worker per period.
*Deliverable:* labor cost visibility + worker payment.

### Phase 5 — Sales / Orders (both types) + Notifications
Ready-made orders (from stock) and custom orders (→ workshop task + deadline), confirmation flow, **`Payment` ledger** (partial payments, customer debt), notifications via **Telegram bot + in-app** (new orders → admin/sales; low stock → warehouse keeper). Customers and (for custom) measurements. *Open question to resolve in this phase's design: quick-sale (POS) flow — see §12.*
*Deliverable:* the actual sales business flow.

### Phase 6 — E-commerce storefront
Customer-facing store (separate app, likely Next.js): browse catalog, cart, place an order. Online orders land as `channel = ONLINE` into the Phase 5 order flow → notification → admin confirms (same path as admin orders).
*Deliverable:* online sales channel.

> **Statistics is not a phase.** It is a byproduct: each module ships with small dashboards built as queries over the ledgers and orders — in UZS or USD (switcher, §4.7).

---

## 7. Engineering standards (cross-cutting — not a phase)

Quality is continuous; each phase ships **with** these, not before them:

- **Tests ship with their phase.** Every phase's deliverable includes unit tests for domain logic (costing, conversions, token rotation) and e2e tests for its endpoints. No "testing phase" at the end.
- **CI from day one:** lint + typecheck + test + build on every push (leveraging Nx affected-only runs).
- **Docker Compose from day one** for the dev environment (PostgreSQL); a production image before first deploy.
- **Automated DB backups before the first real data.** Phase 1 goes live for the warehouse keeper only after scheduled backups (e.g. nightly `pg_dump` + off-site copy) exist. A business's ledger must survive a dead disk.
- **Deploy target decided by the end of Phase 1** (see §12 Open questions), including logging and error-reporting basics.
- **Structured error format + logging** are part of the Phase 0 skeleton.

---

## 8. Data model overview (by phase)

Money-typed fields below use the **Money pattern** of §4.7 (currency, amount, rate, frozen UZS+USD values).

**Phase 0:** `User`, `Role` (seeded table + `RoleCode` enum hybrid — see PHASE_0 §5), `RefreshToken`

**Phase 1:** `Unit` (code, name, dimension, factorToDimensionBase), `ExchangeRate` (date, rateUzsPerUsd, source), `Material` (canonical unit, per-material cross-dimension factors, minStock, cached avg cost UZS/USD), `Supplier`, `MaterialReceipt` + `MaterialReceiptItem` (purchase document: supplier, currency, totalAmount, paidAmount), `MaterialTransaction` (IN/OUT/ADJUSTMENT ledger: material, qty in canonical unit, original qty+unit, unit cost as Money, refType, refId, date), `Stocktake` + `StocktakeLine`

**Phase 2:** `ProductModel`, `ProductVariant` (size, color, sku, sellPrice as Money), `FinishedGoodsTransaction` (variant, type, **grade A|B**, qty, unitCost as Money, ref, date)

**Phase 3:** `Bom` / `Norma` + `BomItem` (material, qtyPerUnit in material's canonical unit), `ProductionOrder` (model/variant, qty, assignee, deadline, status, sourceOrderId?), `ProductionMaterialUsage` (plannedQty, actualQty), completion result (qtyGradeA, qtyGradeB)

**Phase 4:** `Operation` (optional routing), `WageRate`, `ProductionTask` (operation, worker, qtyDone, amount), `WageRecord` (worker, period, total, paid)

**Phase 5:** `Customer`, `CustomerMeasurement`, `Order` (type: READY_MADE | CUSTOM, channel: ADMIN | ONLINE, status, total as Money, deadline?), `OrderItem`, **`Payment`** (order, date, Money, method), `Notification`

**Phase 6:** customer auth + storefront (reuses Phase 5 `Order`)

### Order lifecycle

```
NEW (awaiting confirmation)
  → CONFIRMED
      → READY_MADE:  finished-goods OUT → FULFILLED / SHIPPED
      → CUSTOM:      create ProductionOrder (with deadline)
                       → IN_PRODUCTION → READY → DELIVERED
  → CANCELLED
```

---

## 9. Repository structure & tech stack

### 9.1 Monorepo — Nx (integrated) + npm

One **Nx integrated workspace**, npm as the package manager, following the Nx `apps/` + `libs/` convention:

```
limone/
├── nx.json / package.json        # Nx workspace, npm
├── apps/
│   ├── api/                      # NestJS backend
│   ├── admin/                    # Vite + React admin dashboard
│   └── storefront/               # Phase 6 (likely Next.js)
├── libs/
│   └── shared/                   # single source of truth shared by api & admin:
│                                 #   Zod schemas (validation), Role enum,
│                                 #   statuses, authorization matrix, API types
├── docs/
└── BUSINESS_PLAN.md
```

- Nx provides task graph + caching, `affected`-only CI runs, generators, and **enforced module boundaries** (lint rule: apps may depend on `libs/shared`, never on each other).
- Dependencies are always declared where they are used (guard against phantom dependencies, since npm hoists).

### 9.2 API contract — Zod as the single source

Validation schemas are written **once**, in Zod, inside `libs/shared`:

- **Backend:** `nestjs-zod` uses these schemas as validation pipes (replaces class-validator). Schemas are strict — unknown fields are rejected.
- **Frontend:** React Hook Form + the **same** schemas via `@hookform/resolvers/zod`.
- Enums (roles, order/production statuses, transaction types, currencies, dimensions) live in `libs/shared` and are imported by both sides.

One rule ("username ≥ 3 chars") exists in exactly one place; FE/BE drift is impossible by construction.

### 9.3 Version policy

**Use the latest stable versions that the Nx plugin ecosystem supports.** Nx couples upgrades to its release train (`nx migrate`); when a framework major (e.g. NestJS 12) lands, we upgrade when the corresponding Nx plugin does. Before adding any package, check its current version on the npm registry and verify peer-dependency compatibility. Versions below are the July 2026 baseline.

| Layer | Choice | Version (Jul 2026) |
|-------|--------|--------------------|
| Monorepo | Nx (integrated) + npm | latest Nx |
| Runtime | Node.js | 24 LTS (≥ 20.19 required by TypeORM 1.0) |
| Backend framework | NestJS | 11.x |
| Language | TypeScript | 5.9.x (TS 6 is out but typescript-eslint requires `<6.1.0`; upgrade when the lint ecosystem supports it) |
| ORM | TypeORM | 1.0.x |
| Database | PostgreSQL | 18.x |
| Driver | `pg` | 8.21.x |
| Auth | `@nestjs/jwt` 11, Passport, bcrypt 6 | — |
| Validation | **Zod + nestjs-zod** (schemas in `libs/shared`) | — |
| Lint/test | ESLint 9, typescript-eslint 8.x, Jest 30 | — |
| Frontend | Vite 8 · React 19 · Ant Design 6 · Tailwind CSS 4 | — |

- **Frontend:** React 19 + Vite admin dashboard (`apps/admin`); customer storefront in Phase 6. See `docs/FRONTEND_ARCHITECTURE.md`. Worker-facing screens are **mobile-first** (workers use phones on the workshop floor).
- **Current state (honest):** this repo currently contains only a bare `nest new` scaffold at the root and these planning documents. **No auth, no TypeORM, no domain code exists yet.** (An earlier e-commerce skeleton mentioned in previous revisions lives outside this repo and will *not* be ported — Phase 0 supersedes its design entirely.) When implementation starts, the scaffold is restructured into the Nx workspace above.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Norma inaccuracy (waste/shrinkage) | Track planned vs actual; periodic stocktake → ADJUSTMENT ledger entries |
| Wage model complexity | Start flat per garment; design for per-operation later |
| Scope creep | Strict phase discipline; each phase ships usable |
| Inventory drift | Immutable ledger + stocktake reconciliation |
| **Multi-currency complexity** | Frozen dual-value Money pattern (§4.7); no retroactive revaluation; rates sealed per transaction |
| **Unit-conversion mistakes** | Canonical unit per material; cross-dimension factors are per-material and shown at entry time; original entry preserved |
| **Nx upgrade coupling** | Version policy §9.3: follow Nx release train; avoid pre-release framework majors |
| Late integration testing (bottom-up risk) | Cross-module contracts live in `libs/shared` from day one; tests ship with each phase (§7) |

---

## 11. Glossary

- **Norma / BOM** — material recipe per garment model.
- **Prixod / IN** — stock entry (purchase or production output).
- **Rasxod / OUT** — stock exit (consumption or sale).
- **ADJUSTMENT** — ledger correction from a stocktake (inventarizatsiya).
- **SKU** — unique stock unit = model + size + color.
- **Grade A / Grade B (brak)** — good vs. defective production output.
- **Money pattern** — `{currency, amount, rate, frozen UZS & USD values}` sealed at transaction time (§4.7).
- **Canonical unit** — the single unit a material's stock is kept in.
- **Make-to-stock** — produced in advance for the warehouse.
- **Make-to-order** — produced on demand from a custom order.
- **Piece-rate (sdelniy)** — pay per produced unit/operation.
- **Sex** — the workshop / production floor.

---

## 12. Open questions (deliberately unresolved)

| # | Question | Decide when |
|---|----------|-------------|
| 1 | **Quick-sale (POS) flow** — is there a physical shop needing one-step "sell now" (order created directly as FULFILLED, channel SHOP)? | Phase 5 detailed design |
| 2 | **Deploy target** — VPS vs cloud, hosting location, TLS, domain | End of Phase 1 (before first real data) |
| 3 | **Supplier debt (payables)** — credit purchases ledger; door kept open via totalAmount/paidAmount on receipts (§4.4) | Phase 5+ or never |
| 4 | **TypeScript 6 upgrade** — blocked on typescript-eslint support | When lint ecosystem allows |
| 5 | **Role-creation UI + permissions model** — roles table ships seeded (system roles fixed); creating roles via UI needs DB-stored permissions first (PHASE_0 §13) | When dynamic roles are actually requested |
| 6 | **Nx adoption timing** — owner decision (2026-07-25): learn fundamentals first, so `apps/admin` runs as a standalone Vite project (own package.json) and the API stays at the repo root; Nx + `apps/api` move + `libs/shared` come later. Until then Zod schemas are duplicated FE-side (drift risk accepted, kept small).<br>**Evidence so far (2026-08-05):** `PHONE_PATTERN` now lives in three files — `src/users/dto/user-fields.schema.ts` plus the FE profile and staff form schemas — and had to be edited in all three at once. This is the kind of duplication `libs/shared` exists to remove.<br>**What does _not_ argue for Nx:** duplicated *runtime values*. The idle-session limit was a second copy of `REFRESH_TOKEN_TTL`; it was solved by having the API send `sessionIdleMs` in the login/refresh response (§FRONTEND.md B.10), which is better than sharing a constant because it needs no rebuild. Only *compile-time contracts* — schemas, DTO types, enums — actually need `libs/shared` | When shared-contract pain or a second consumer app makes it worth it |
| 7 | **Per-country phone validation (`libphonenumber-js`)** — owner decision (2026-08-04): phone is a plain contact field today, so the E.164 *shape* check (`/^\+?\d{7,15}$/`, verified against 22 countries) is proportionate; a ~90–145 KB metadata bundle is not. Accepted gap: a number with the wrong digit count for its country still passes | When SMS notifications ship (Phase 5 orders) — an undeliverable number then costs money, not just tidiness |
| 8 | **Device labelling in the sessions list (iPad + duplicate parser)** — owner decision (2026-08-07): defer. The Sessions card names each live session from the `User-Agent` header alone. Two defects, different owners: **(a) not ours** — iPadOS 13+ Safari reports `Macintosh; Intel Mac OS X` by design, so an iPad shows as "Safari · macOS" with a laptop icon. No regex can fix this: the UA string genuinely lacks the information. Only a client-supplied `navigator.maxTouchPoints` hint can, and only because Apple has never shipped a touchscreen Mac — which makes `Macintosh` + touch unambiguous (the same rule applied to Windows would misfire on touchscreen laptops). **(b) ours** — `parseUserAgent` (`src/shared/utils/user-agent.util.ts`) and `deviceInfo` (`apps/admin/src/features/profile/lib.ts`) are near-identical parsers carrying the identical bug, so every UA fix must be applied twice. `device_type` is already `varchar(10)`, so `'tablet'` needs no migration.<br>**Why this is not cosmetic:** the Sessions card is a security screen — its only job is to let the owner conclude "I don't recognise this device". A permanently wrong label trains them to ignore mismatches, which makes the screen worse than useless.<br>**Cost estimate (2026-08-07):** ~30 min, no migration, no new dependency | When a tablet is actually used in the workshop, or alongside the responsive shell (UI-F) — whichever comes first. The client-hint plumbing (an axios default header) is shared with that work |

---

## 13. Immediate next step

1. Review & approve `docs/PHASE_1_MATERIAL_WAREHOUSE.md` (drafted alongside this revision).
2. ~~Scaffold the Nx workspace~~ **Deferred** (§12 #6): `apps/admin` runs standalone; Nx + `libs/shared` later.
3. Implement **Phase 0 + Phase 1 together** as the first usable slice, with the engineering standards of §7.
