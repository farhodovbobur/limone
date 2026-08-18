# Phase 1 — Material Warehouse

> **Status:** Draft — for review
> **Last updated:** 2026-07-05
> **Stack:** Nx monorepo (`apps/api`) · NestJS 11 · PostgreSQL 18 · TypeORM 1.0 · Zod (`nestjs-zod`, schemas in `libs/shared`)
> **Related:** `../BUSINESS_PLAN.md` (§4.6–4.9, §8), `./PHASE_0_FOUNDATION.md` (§6 authorization matrix)
> **Note:** This English document is canonical; `PHASE_1_MATERIAL_WAREHOUSE_UZ.md` is a translation.

---

## 1. Goal

The first **usable** module: the warehouse keeper records material purchases (IN), issues material to the workshop (OUT), sees live stock and its value, gets low-stock warnings, and reconciles reality with the books via stocktakes (ADJUSTMENT). Every later phase (BOM, production, costing) reads from the ledger this phase creates.

---

## 2. Scope

**In scope**
- Units of measure (dimensions, global + per-material conversion)
- Exchange rates (manual + CBU API) and the **Money pattern** (frozen dual UZS/USD values)
- Material catalog (+ light material categories) and suppliers
- Purchase receipts (**IN**) — multi-line documents with currency, `totalAmount`, `paidAmount`
- Material issue (**OUT**) with weighted-average costing
- Immutable `MaterialTransaction` ledger; current stock & value derived from it
- Stocktake (inventarizatsiya) → **ADJUSTMENT** ledger entries
- Low-stock alerts (in-app from this phase; Telegram delivery arrives with Phase 5)
- Small dashboard: stock value (UZS/USD switcher), recent movements, low-stock list

**Out of scope (non-goals)**
- Finished goods (→ Phase 2), BOM/auto-deduction (→ Phase 3)
- Supplier debt / payables ledger — **deferred** (`BUSINESS_PLAN.md` §12); receipts still store `totalAmount` vs `paidAmount` so it can be added without migration
- FIFO / batch (partiya) tracking — weighted average only (§4.8 of the business plan)
- Barcode / label printing, multi-warehouse, material photos — revisit after real usage

---

## 3. Locked decisions applied here

| # | Decision | Source |
|---|----------|--------|
| D1 | Full multi-currency; every money value frozen as `{currency, amount, rate}` at write time; no retroactive revaluation; reports switchable UZS/USD via each row's own frozen rate | Business plan §4.7 (revised 2026-08-17) |
| D2 | Costing = **weighted average**, maintained in parallel in UZS and USD | §4.8 |
| D3 | Units have **dimensions**; global conversion within a dimension; **per-material factors** across dimensions; ledger always in the material's **canonical unit** | §4.9 |
| D4 | Ledger is immutable; corrections are reversing entries, never edits | §4.6 |
| D5 | Stock may never go negative — an OUT larger than current stock is rejected | this doc |
| D6 | Receipts post immediately (no draft state in MVP) | this doc |

---

## 4. Units of measure

**Dimensions:** `LENGTH` (base: meter), `MASS` (base: kg), `COUNT` (base: piece), `AREA` (base: m²).

**`units` table** — seeded, admin-extendable: `code` (unique: `m`, `cm`, `kg`, `g`, `pc`, `pair`, `roll`, `bobbin`, `m2`…), `name`, `dimension`, `factor_to_base` (e.g. `cm` → 0.01; `roll`/`bobbin` are COUNT units with factor 1).

**Conversion algorithm** — entering quantity `q` in unit `U` for material `M` with canonical unit `C`:

1. `U = C` → store `q` as-is.
2. `U.dimension = C.dimension` → `q × U.factor_to_base / C.factor_to_base` (global, exact).
3. Different dimensions → look up `material_unit_factors(M, U)`; if found, `q × factor`; if not, the entry is **rejected** and the UI prompts the user to define the factor first (e.g. "for this fabric: 1 kg = 3.2 m", "1 roll = 25 m").

The ledger stores the **canonical quantity** plus the original `q`/`U` for audit. Per-material factors are editable reference data — changing one affects only *future* entries (D4).

---

## 5. Currency & the Money pattern

**`exchange_rates`** — one row per date: `date` (unique), `rate`, `source` (`MANUAL` | `CBU`). A transaction dated `D` uses the rate with the latest `date ≤ D`; if none exists, the API returns a clear error and the UI asks the admin to enter one (or pull from the CBU API).

**Money embedded value** (TypeORM embedded / column group, Zod schema in `libs/shared`):

| Field | Type | Meaning |
|-------|------|---------|
| `currency` | enum `UZS`\|`USD` | currency the user entered |
| `amount` | numeric(18,2) | value in the entered currency |
| `rate` | numeric(14,2) | UZS per USD, applied on that date |
| `uzs_value` | numeric(18,2) | frozen UZS equivalent |
| `usd_value` | numeric(18,4) | frozen USD equivalent (4 dp — unit costs can be small) |

Reports sum `uzs_value` or `usd_value` depending on the UI switcher — historical rows never change (D1).

---

## 6. Data model

Quantities: `numeric(14,3)` in the canonical unit unless stated.

**`material_categories`** — light grouping (fabric, accessory, thread…): `id`, `name`.

**`suppliers`** — `id`, `name`, `phone`, `notes`, `is_active`, timestamps. No hard delete.

**`materials`**
| Column | Notes |
|--------|-------|
| `id`, `name`, `code` (unique, optional), `category_id` FK | |
| `canonical_unit_id` FK → units | the unit stock is kept in |
| `min_stock` | low-stock threshold, canonical unit |
| `current_stock` | **cached**, = SUM(ledger qty); rebuildable |
| `avg_cost_uzs`, `avg_cost_usd` | **cached** weighted averages (§7) |
| `is_active`, timestamps | deactivate, never delete |

**`material_unit_factors`** — `material_id`, `from_unit_id`, `factor` (1 from-unit = factor × canonical unit), unique (material, from_unit).

**`material_receipts`** (purchase document; posting creates IN ledger rows)
`id`, `number` (auto, e.g. `RCP-2026-0001`), `supplier_id`, `date`, `currency`, `rate`, `total` (Money, computed from lines), `paid_amount` numeric — same currency as `total` (door left open for payables), `notes`, `created_by`, timestamps.

**`material_receipt_items`** — `receipt_id`, `material_id`, `qty_entered` + `unit_entered_id`, `qty_canonical`, `unit_price` (Money, per entered unit), `line_total` (Money).

**`material_transactions`** — the immutable ledger:
| Column | Notes |
|--------|-------|
| `id`, `material_id` | |
| `type` | `IN` \| `OUT` \| `ADJUSTMENT` |
| `qty` | **signed**, canonical unit: IN > 0, OUT < 0, ADJUSTMENT either. `current_stock = SUM(qty)` |
| `original_qty`, `original_unit_id` | what the user actually typed (audit) |
| `unit_cost` | Money, per canonical unit (IN: from receipt; OUT/ADJUSTMENT: weighted avg at that moment) |
| `ref_type`, `ref_id` | `RECEIPT` \| `ISSUE` \| `STOCKTAKE` (later: `PRODUCTION`) |
| `note`, `created_by`, `created_at` | **no** `updated_at` — rows are never edited (D4) |

**`material_issues`** (OUT document) — Phase 1 has no production orders yet, so an issue records: `id`, `number`, `date`, `purpose` (free text, e.g. "sexga — ko'ylak partiyasi"), `issued_to` (free text or user), lines (`material_id`, `qty_entered`/`unit`, `qty_canonical`), `created_by`. From Phase 3, production consumption references the production order instead.

**`stocktakes`** — `id`, `date`, `status` (`IN_PROGRESS` | `COMPLETED`), `created_by`, `completed_at`; lines: `material_id`, `system_qty` (snapshot at start), `counted_qty`, `difference` (derived). Completing the stocktake writes one ADJUSTMENT ledger row per non-zero difference (valued at current weighted average) and locks the document.

---

## 7. Costing rules (weighted average)

Maintained per material, in parallel for UZS and USD (from frozen Money values):

- **IN (receipt):** `new_avg = (stock_qty × avg + in_qty × in_unit_cost) / (stock_qty + in_qty)` — computed independently for `uzs` and `usd` columns. Stock += qty.
- **OUT (issue):** `unit_cost = current avg` (both currencies). Stock −= qty. Average unchanged.
- **ADJUSTMENT:** surplus or shortage valued at current avg. Average unchanged.
- **Stock reaches 0:** the next IN sets the average to that receipt's unit cost (no residual-value carryover).
- **Negative stock forbidden (D5):** an OUT or negative ADJUSTMENT that would take stock below 0 is rejected with the available quantity in the error.
- Cached `current_stock` / `avg_cost_*` are recomputable from the ledger (a `rebuild` maintenance job guards drift).

Unit tests for these rules ship with this phase (engineering standards, business plan §7).

---

## 8. API endpoints

All under `/api`. `WK` = warehouse_keeper, `WM` = workshop_manager. Per the Phase 0 authorization matrix: **admin RW, WK RW, WM read-only; worker & sales — no access.** Reference data (units, rates, categories) is admin-write.

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET/POST/PATCH | `/units` | R: admin+WK+WM · W: admin | Units of measure |
| GET/POST | `/exchange-rates` | R: authenticated · W: admin | Rates; `POST /exchange-rates/sync-cbu` pulls today's CBU rate |
| GET/POST/PATCH | `/material-categories` | R: admin+WK+WM · W: admin | Light grouping |
| GET/POST/PATCH | `/suppliers` | R+W: admin+WK | No DELETE — deactivate |
| GET/POST/PATCH | `/materials` | R: admin+WK+WM · W: admin+WK | Catalog; PATCH includes `min_stock`, factors |
| GET/PUT | `/materials/:id/unit-factors` | R: admin+WK+WM · W: admin+WK | Per-material conversion factors |
| GET | `/materials/:id/transactions` | admin+WK+WM | Ledger history (paginated) |
| GET | `/materials/low-stock` | admin+WK+WM | `current_stock ≤ min_stock` |
| GET/POST | `/material-receipts` | R: admin+WK+WM · W: admin+WK | Create = post: writes IN rows, updates averages |
| GET/POST | `/material-issues` | R: admin+WK+WM · W: admin+WK | Create = post: writes OUT rows at current avg |
| GET/POST | `/stocktakes` | R: admin+WK+WM · W: admin+WK | Start with snapshot lines |
| PATCH | `/stocktakes/:id/lines` | admin+WK | Enter counted quantities |
| POST | `/stocktakes/:id/complete` | admin+WK | Writes ADJUSTMENTs, locks document |
| GET | `/reports/stock-value` | admin+WK+WM | Total & per-material value, UZS/USD |

Validation for every body: Zod schemas in `libs/shared`, shared with the admin UI forms.

---

## 9. Frontend screens (apps/admin)

1. **Materials list** — table: name, category, canonical unit, current stock, min stock, avg cost (UZS/USD switcher), low-stock rows flagged with a warning chip (status color + label, never color alone).
2. **Material form** — drawer: name, code, category, canonical unit, min stock, unit factors editor ("1 kg = __ m").
3. **Receipt form** — supplier, date, currency (+ rate shown, editable), lines (material, qty + unit, unit price), total & paid amount; posts on save.
4. **Issue form** — purpose, lines (material, qty + unit); shows available stock inline.
5. **Material card** — stock, averages, ledger history (paginated), factors.
6. **Stocktake flow** — start (snapshot) → fill counted → review differences → complete.
7. **Suppliers, units, rates** — simple reference CRUD (rates: manual entry + "fetch CBU" button).
8. **Warehouse dashboard** — stock value, low-stock list, recent movements.

---

## 10. Acceptance criteria (Definition of Done)

- [ ] A receipt in USD writes IN rows with frozen `uzs_value`/`usd_value` using that date's rate; a later rate change does **not** alter them.
- [ ] Entering a purchase in a non-canonical unit (g for a kg-material; kg for a m-fabric with a factor) stores the correct canonical quantity and preserves the original entry.
- [ ] Entering a cross-dimension quantity with **no** factor defined is rejected with a helpful error.
- [ ] Weighted average matches hand-computed values after a mixed sequence of INs at different prices/currencies (unit-tested).
- [ ] An issue (OUT) larger than current stock is rejected; stock never goes negative.
- [ ] Completing a stocktake writes ADJUSTMENTs equal to counted − system, valued at current average, and locks the stocktake.
- [ ] `current_stock` and `avg_cost_*` always equal a from-scratch ledger recomputation (rebuild job verified in tests).
- [ ] Low-stock list shows exactly the materials with `current_stock ≤ min_stock`.
- [ ] Stock-value report returns the same totals in UZS and USD views as the sum of frozen ledger values.
- [ ] Role matrix enforced: warehouse keeper full access; workshop manager read-only (403 on writes); worker/sales 403 on all.
- [ ] Ledger rows are immutable — no update/delete endpoint exists for transactions.

---

## 11. Open questions (Phase 1)

| # | Question | Decide when |
|---|----------|-------------|
| 1 | CBU API details (endpoint, auth, fallback when unreachable) | implementation |
| 2 | Should issues require a named recipient (user FK) instead of free text? | after first real usage |
| 3 | Receipt editing policy — reversal document vs. admin-only void | implementation (default: reversal) |

---

## 12. Next step

Review and approve this design together with `PHASE_0_FOUNDATION.md`, then scaffold the Nx workspace and implement **Phase 0 + Phase 1** as the first usable slice (business plan §13).
