# Phase 2 — Catalog, Finished-Goods Warehouse & Price List

> **Status:** Design sealed 2026-08-17 — ready to build
> **Last updated:** 2026-08-17
> **Stack:** NestJS 11 · PostgreSQL 18 · TypeORM · Zod (`nestjs-zod`) · React 19 admin (`apps/admin`)
> **Related:** `../BUSINESS_PLAN.md` (§4.6–4.8, §8), `./PHASE_1_MATERIAL_WAREHOUSE.md` (ledger pattern), `./PHASE_0_FOUNDATION.md` (§6 authorization matrix)
> **Note:** This English document is canonical; `PHASE_2_FINISHED_GOODS_UZ.md` is a translation.

---

## 1. Goal

Know what garments exist, how many of each are in stock, what condition they are in, and what they sell for. The owner's decision of 2026-08-08 moved this ahead of Phase 1: the workshop needs its clothing counted and priced before it needs its fabric tracked.

Every later phase reads from what this phase creates — production (Phase 3) writes into this ledger, sales (Phase 5) reads stock and price from it.

---

## 2. Scope

**In scope**

- Product catalog: products, sizes, colors, variants (SKU = product + size + color)
- **Price list with history** — one selling price per variant, Money-typed (UZS/USD), append-only so past prices stay answerable
- Immutable `warehouse_product_movements` ledger: **IN / OUT / ADJUSTMENT**
- Quality grades **A / BRAK**, stock tracked per (variant, grade)
- Weighted-average cost per variant, maintained in UZS and USD
- Opening-balance entry (how the first stock gets in before production exists)
- Stocktake → ADJUSTMENT
- Dashboard: stock count, stock value, low-stock list, recent movements

**Out of scope (non-goals)**

- Material warehouse (→ Phase 1) — only `ExchangeRate` is borrowed from it
- BOM / automatic cost from production (→ Phase 3); cost is entered by hand for now
- Purchase documents from suppliers (→ Phase 1 brings `Supplier`); goods enter via opening balance or, later, production
- Multiple price levels (wholesale/retail) — owner decision 2026-08-08: **one price**. Adding a second level later means a migration; accepted.
- **Discounts and below-cost selling** — these belong to the *transaction*, not the product. The price list answers "what does this garment cost?"; `order_lines` (Phase 5) answers "what did we actually charge?" (D15)
- A second markup kind, `MARGIN` (percentage of price rather than cost) — not requested yet (§11)
- Barcodes, photos, multi-warehouse — revisit after real usage

---

## 3. Locked decisions applied here

| #   | Decision | Source |
|-----|----------|--------|
| D1  | Money pattern: every money value frozen as `{currency, amount, rate}` at write time; no retroactive revaluation | Business plan §4.7 |
| D2  | Costing = **weighted average**, maintained in parallel in UZS and USD — genuinely two facts, because no single rate connects them | §4.8 |
| D3  | Ledger is immutable; corrections are reversing entries, never edits | §4.6 |
| D4  | Stock may never go negative — an OUT larger than current stock of that (variant, grade) is rejected | Phase 1 D5, same rule |
| D5  | Cost is entered **manually** in this phase, and every row records **where the cost came from** (`cost_source`) so Phase 3's computed costs never silently mix with estimates | owner decision 2026-08-08 |
| D6  | Stock is per **(variant, grade)**; cost is per **variant** — a BRAK garment consumed the same materials as an A garment, so it carries the same cost and only its price differs | this doc |
| D7  | Sizes and colors are **reference tables**, not free text — free text becomes "qora" / "Qora" / "чёрный" within a week | this doc |
| D8  | Catalog naming is `products` / `product_variants`, **not** `product_models`. `Model` is ORM vocabulary and collides in code (`ProductModelsService`, `model.modelId`); `products` matches the already-written `product_categories` and is the universal term every later integration speaks | owner decision 2026-08-17 |
| D9  | The warehouse references `product_variants.id` **only**, never `products.id`. Stock is physical — a shelf holds M/black, not "Ko'ylak-01" — and D4 is *unenforceable* at product level (10 in stock as 2×M + 8×L would approve an order for 5×M) | 2026-08-17 |
| D10 | Warehouse tables are prefixed `warehouse_product_*`. Here `product` is an **adjective** — *which* warehouse — not the FK target. Phase 1's material warehouse becomes `warehouse_material_*`, giving both a symmetric shape | owner decision 2026-08-17 |
| D11 | Ledger rows are **`movements`**, not `transactions`. Every service that writes one does so inside `dataSource.transaction()`, where the word already means something else | 2026-08-17 |
| D12 | Stock and cost live in their **own derived tables**, and grade is a **row**, not a column. Grade-as-column makes a third grade (2-sort, realistic in a garment shop) a migration touching every query; derived data on the catalog table cannot be truncate-and-rebuilt, which is what makes the §6 correctness guarantee provable rather than hoped-for | 2026-08-17 |
| D13 | The price list is **append-only with history**; `amount` is the sole authority. `markup_fixed` / `markup_percent` are rebuildable caches, computed by the backend, and the append-only rule does not apply to them | owner decision 2026-08-17 |
| D14 | **No CHECK constraints and no generated columns.** All calculation and validation lives in the backend; the database stores facts, enforces structure (`NOT NULL`, FK, indexes) and nothing else. This matches the existing codebase, which contains neither | owner decision 2026-08-17 |
| D15 | The price list holds **list prices only**. Discounts, negotiated prices and clearance sales are properties of an order line, not of a garment | owner decision 2026-08-17 |
| D17 | A garment carries **one or two colours**, never more. The pair lives on the variant as `color_id` + `color2_id` (nullable), **not** as a combination row in `colors`. The names are ordinal, not hierarchical: the swatch is a full circle for one colour and an even 50/50 split for two, so neither colour is ever subordinate and no column may imply otherwise. Order still matters — it decides which half of the circle a colour takes, and `(black, white)` is therefore a different variant from `(white, black)`. This also makes "show me everything containing black" a plain `color_id = X OR color2_id = X`; a combination row would have hidden the black inside an opaque "Qora-Oq" entry | owner decision 2026-08-17 |
| D16 | Reference names are multilingual from day one. **`name`** is the unique key and the source the SKU is built from; **`translations jsonb`** holds every display name — **`uz` included**. The duplication of one short string is deliberate: it keeps all locales symmetric, so there is one sort expression, one form and no special case in any render path. `ReferenceService` defaults `translations.uz` to `name` on write, and the two may diverge afterwards because they do different jobs. A fourth language costs no migration | owner decision 2026-08-17 |

### Design review — 2026-08-17

The data model was reviewed end to end before any of it was built. What changed, and what was considered and rejected:

| Considered | Rejected because |
|------------|------------------|
| `product_models` / `styles` / `garments` as the parent name | `model` collides with ORM vocabulary; `styles` collides with CSS in a fullstack repo; `garments` locks the schema to clothing |
| Size/color as columns on the warehouse row, no `product_variants` table | Price, SKU, `min_stock` and activation all live at variant grain, so the variant table reappears as `price_list (product_id, size_id, color_id, …)` — the same table, later and worse. Also: a size×color combination could not be validated by any FK, and the matrix bulk-create and production order have nowhere to point |
| `current_stock_a` / `current_stock_brak` as columns on `product_variants` | Enum-as-column-name; a third grade becomes a migration; and the catalog table cannot be truncated, so the "cached = recomputed" guarantee is unprovable |
| A `MANUAL` markup kind, for market-set prices | Market pricing is expressible without it (`amount` is typed directly), and clearance/loss-selling belongs to the order (D15) |
| `markup_type` + `markup_value` (tagged union) | The type only mattered for a bulk re-price suggestion, and markup turned out to be *policy* — current and mutable — not a fact worth freezing per row |
| `markup_percent` / `markup_fixed` as mutually exclusive nullable columns | Not what was wanted: both are always populated, as two views of one profit |
| `GENERATED ALWAYS AS … STORED` for the markup caches | Would make drift physically impossible, but puts calculation in the database (D14) and would be the codebase's first generated column |
| Frozen `uzs_value` / `usd_value` on every money row | Derivable from `{currency, amount, rate}`, all three of which are frozen. Contained by the single-conversion-helper rule (§4.7) |
| A composite FK tying the frozen rate to its `exchange_rates` row and date | Guards a *pointer* whose value has already been copied onto the row; the copy is the authority |
| `name_uz` / `name_ru` / `name_en` columns | A fourth language becomes a migration on every table, DTO and form. Worse, `UNIQUE` across three nullable columns admits duplicates silently: PostgreSQL NULLs never collide, so two half-translated rows both pass |
| A `*_translations` table per reference table | A JOIN on every dropdown read, multiplying on nested loads (product → variant → color) — and `ReferenceService<T>`, the cleanest class in the codebase, would need translation-aware CRUD |
| `uz` **absent** from the JSON, with `name` doubling as the Uzbek display value | Chosen first, then reversed by the owner the same day. It forced two different sort expressions — `ORDER BY name` for Uzbek but `COALESCE(translations->>'ru', name)` for Russian — and made one locale special in every render path and every form. Storing `uz` alongside RU/EN costs one duplicated short string per row and buys a uniform read, sort and form |
| Locale-first nesting, `{"ru":{"name":…}}` | Only `name` is translated today. Reshaping the JSON when `description` arrives is a *data* migration — no `ALTER TABLE` — over a few dozen rows |
| A two-tone combination as its own `colors` row (`hex` + `hex2`, e.g. "Qora-Oq") | Recommended first, then withdrawn the same day against a requirement it cannot meet: filtering by "black" must also return two-toned garments containing black, and a combination row hides its components behind one opaque id. Patching it — giving the combination row FKs back to its base colours — would put two species of row in one table, make the filter a three-way `OR`, and keep every problem the variant-level pair has |
| `locale` as the column name | A locale *is* `'ru'`; a map of names keyed by locale is not one. `translations` is the term every comparable system uses |
| `decimal.js` for money arithmetic | Measured first: over 200 incremental weighted-average recomputations, float diverged from exact decimal arithmetic by 1.9 × 10⁻⁹ so'm — identical after rounding to 2 dp. A 30-line `src/shared/money.ts` covers the real need (`numeric` arrives from PostgreSQL as a `string`). Revisit if a Phase 5 reconciliation test ever differs by a tiyin |

---

## 4. Borrowed from Phase 1

Only one table is needed early:

**`exchange_rates`** — `id`, `date` (unique), `rate`, `source` (`MANUAL` | `CBU`). One rate per date. Needed because prices and costs are Money-typed and must freeze a rate at write time.

The column is named `rate`, not `rate_uzs_per_usd`: the table name already says *exchange*, and `{currency, amount, rate}` is how the Money pattern is written in §4.7. The direction — **how many UZS one USD buys** — is documented on the entity and encoded once in `src/shared/money.ts`. Nothing else in the codebase may multiply or divide by a rate.

`Unit` is **not** needed: garments are counted in pieces. `Supplier` is not needed until goods can be purchased rather than produced.

---

## 5. Data model

Quantities are whole pieces: `integer`. Money follows §4.7.

### 5.1 Catalog — what exists

All three reference tables share one shape: `name` + `translations` (D16).

**`product_categories`** — light grouping (ko'ylak, shim, kurtka…): `id`, `name`, `translations`, `is_active`. *Written.*

**`sizes`** — `id`, `name` ("S", "M", "46"), `translations`, `sort_order`, `is_active`. Ordered because "S, M, L, XL" must not sort alphabetically. `translations` is usually empty here — sizes are language-neutral — and that emptiness is cheaper than making `sizes` the one table every render path has to special-case. *Written.*

**`colors`** — `id`, `name` ("Qora"), `translations` (`{"ru":"Чёрный","en":"Black"}`), `hex` (optional, for a swatch in the UI), `is_active`. *Written.*

**How names work (D16).** Two columns with two jobs:

```
name          →  unique key · SKU source · never displayed
translations  →  every display name, uz included    {"uz":"Qora","ru":"Чёрный","en":"Black"}
```

`ReferenceService` defaults `translations.uz` to `name` on create, so the common case needs no extra typing. They are then free to diverge — `name = "Qora"` with `translations.uz = "Qora rang"` is legitimate, because one is a key and the other is a label. Renaming `name` alone does **not** rewrite the label; `uz` is only re-defaulted when translations are part of the same patch.

Resolution is one helper, `displayName(row, locale)` in `src/shared/i18n/locales.ts`, falling back requested → `uz` → `name`. `LOCALES` in the same file is the single list of shipped languages. The DTO's `.strict()` rejects an unknown locale key, which is the one guarantee a `jsonb` column cannot give on its own — D14 working as intended rather than a gap.

Two consequences worth planning for:

- **A `PATCH` replaces `translations` wholesale, it does not merge.** The API returns the full object and the form edits every locale at once, so replace is both simpler and what the UI actually means.
- **Sorting depends on the reader's language**, but with one expression for every locale:

  ```sql
  ORDER BY COALESCE(translations->>$locale, translations->>'uz')
  ```

  Reference tables are small and unpaginated, so the frontend sorts them. Paginated lists (`products`) must take a `?locale=` parameter, or a Russian-speaking user sees an apparently unsorted list.

**`products`**

| Column | Notes |
|--------|-------|
| `id`, `name`, `translations` | "Ko'ylak-01" + RU/EN (D16) |
| `code` (unique, optional) | article number, e.g. `KOY01` — feeds the SKU |
| `category_id` FK | |
| `notes` | |
| `is_active`, timestamps | deactivate, never delete |

**`product_variants`** — one row per sellable SKU

| Column | Notes |
|--------|-------|
| `id`, `product_id` FK, `size_id` FK | |
| `color_id` FK → `colors` | first colour, `NOT NULL` |
| `color2_id` FK → `colors` | second colour, `NULL` for a solid garment (D17) |
| — | **`UNIQUE NULLS NOT DISTINCT (product_id, size_id, color_id, color2_id)`**. `NULLS NOT DISTINCT` (PostgreSQL 15+) is load-bearing, not decoration: under an ordinary `UNIQUE`, two rows with the same first colour and a `NULL` second both insert cleanly, because NULLs never collide — verified against this project's PostgreSQL 18 |
| `sku` | auto-generated from `products.code` + `sizes.name` + slugified colour names → `KOY01-M-QORA`, or `KOY01-M-QORA-OQ` when two-toned; editable, unique. Built from `name`, never from a translation, so it is language-neutral and unaffected by later translation edits |
| `is_active`, timestamps | |

Neither price nor stock lives here. Both are separate concerns with their own history — see 5.2 and 5.3.

### 5.2 Price list — `product_prices`

Append-only. A price is never edited; a correction is a new row. The price in force on any date is the latest row whose `date` has arrived.

| Column | Notes |
|--------|-------|
| `id` | |
| `variant_id` FK | `ON DELETE RESTRICT` — a variant with price history cannot be deleted |
| `date` | from which day this price applies; **may be in the future** |
| `currency` | `UZS` \| `USD` |
| `amount` | ★ **the sole authority** — the price, frozen |
| `rate` | UZS per USD, copied from `exchange_rates` at decision time |
| `base_cost` | the cost the decision was based on, in `currency`. `NULL` = cost unknown |
| `markup_fixed` | cache: `amount − base_cost` |
| `markup_percent` | cache: `(amount / base_cost − 1) × 100`, rounded to 2 dp |
| `note`, `created_by`, `created_at` | **no** `updated_at` |

```sql
INDEX (variant_id, date DESC, id DESC)
```

Canonical read — this expression lives in exactly one query builder:

```sql
SELECT DISTINCT ON (variant_id) *
FROM product_prices
WHERE date <= (now() AT TIME ZONE 'Asia/Tashkent')::date
ORDER BY variant_id, date DESC, id DESC;
```

Asking for a past date is the same query with a different date. That is the whole history feature.

Three things that look like details and are not:

- **`id DESC` is load-bearing.** Two rows may share a `date` — that is how a same-day mistake gets corrected under append-only. Without the tiebreaker, `DISTINCT ON` returns an arbitrary one of them (verified against PostgreSQL 18: it returned the *older* row). There is deliberately **no** `UNIQUE (variant_id, date)`.
- **`AT TIME ZONE 'Asia/Tashkent'`, never `CURRENT_DATE`.** `CURRENT_DATE` is UTC, so a price scheduled for tomorrow would take effect at 19:00 today (§4.11).
- **`rate` is a copied number, not an FK.** Correcting an `exchange_rates` row next week must not revalue prices frozen last week. The copy makes that structurally impossible, which is also why `exchange_rates` does not need to become append-only.

**Markup semantics.** The form shows three live-linked fields — percent, fixed, amount. Typing in any one recomputes the other two. Only `amount` is frozen as a decision; the two markup columns are recomputed *descriptions* of it, kept so the price list can show "30 % markup = 26 500 so'm" without recomputing on every read. They are rebuildable from `base_cost` + `amount`, so D3's immutability does not apply to them — a formula fix is a maintenance recompute, not an edit to history.

Percent is rounded, not truncated (`30.2857…% → 30.29`), and it is deliberately **not** reversible: recovering `amount` from a 2-dp percent loses up to a few so'm. `amount` is the only input to anything downstream.

**`base_cost = NULL` means "cost unknown", not "cost zero".** This is the normal state, not an edge case: the build order prices variants at step 3 and stock arrives at step 4, so a variant's *first* price is usually set before any cost exists. A garment never costs zero, so zero is never the honest answer. Both markup caches are `NULL` in that case.

### 5.3 Warehouse — one fact, two derived tables

**`warehouse_product_movements`** — ★ the only fact. Immutable (D3).

| Column | Notes |
|--------|-------|
| `id`, `variant_id` FK | D9 — never `product_id` |
| `type` | `IN` \| `OUT` \| `ADJUSTMENT` |
| `grade` | `A` \| `BRAK` |
| `qty` | **signed**, pieces: IN > 0, OUT < 0, ADJUSTMENT either |
| `unit_cost` | Money per piece. IN: entered; OUT/ADJUSTMENT: weighted average at that moment |
| `cost_source` | `MANUAL` \| `PURCHASE` \| `PRODUCTION` (D5) |
| `ref_type`, `ref_id` | `OPENING` \| `STOCKTAKE` \| `ISSUE` (later: `PRODUCTION`, `ORDER`) |
| `note`, `created_by`, `created_at` | **no** `updated_at` |

**`warehouse_product_balances`** — derived. `PK (variant_id, grade)` → `qty`, `updated_at`.

**`warehouse_product_costs`** — derived. `PK (variant_id)` → `avg_cost_uzs`, `avg_cost_usd`, `qty_total`, `updated_at`.

```
   ┌─────────────────────┐                    ┌──────────────────┐
   │ movements           │  ──── replay ────▶ │ balances         │
   │ IN · OUT · ADJUST   │                    │ costs            │
   │ immutable           │                    │ droppable and    │
   └─────────────────────┘                    │ rebuildable      │
          FACT                                └──────────────────┘
                                                    DERIVED
```

Grade is a **row**, not a column (D12). Adding `2-SORT` later is an `INSERT`, not a migration.

Multi-warehouse is out of scope, but note the door it leaves open: adding `warehouse_id` to the balances key is a truncate-and-rebuild, not a data migration — because the table is derived.

**`stocktakes`** — `id`, `number`, `date`, `status` (`IN_PROGRESS` | `COMPLETED`), `created_by`, `completed_at`; lines: `variant_id`, `grade`, `system_qty` (snapshot at start), `counted_qty`, `difference` (derived). Completing writes one ADJUSTMENT per non-zero difference, valued at the current weighted average, and locks the document.

---

## 6. Costing rules

Same method as Phase 1, simpler inputs — no unit conversion, so the average is over pieces.

```
after each IN:
  new_avg = (old_stock × old_avg + in_qty × in_cost) / (old_stock + in_qty)

  computed twice, once per currency (D2 — the two are not convertible into each other)
  old_stock here = SUM(balances.qty) across grades   (cost is grade-independent, D6)

on OUT / ADJUSTMENT:
  unit_cost = the variant's current weighted average, frozen into the row
```

`warehouse_product_balances` and `warehouse_product_costs` must always equal a from-scratch replay of the ledger. Because they are separate tables, that is **provable**, not hoped-for:

```sql
TRUNCATE warehouse_product_balances, warehouse_product_costs;
-- replay every movement in id order, then compare
```

A rebuild command does exactly this and reports any difference (§9).

---

## 7. How stock first appears

Production does not exist yet, and purchase documents belong to Phase 1. So this phase ships an **opening balance** entry:

- pick variant + grade, enter quantity and unit cost
- writes `type=IN`, `ref_type=OPENING`, `cost_source=MANUAL`

This is the honest form of "we counted what was in the room on day one". When Phase 3 lands, production writes `cost_source=PRODUCTION` rows beside them and reports can separate estimated from computed.

---

## 8. API endpoints

```
GET    /product-categories            CRUD (admin)          ← written
GET    /sizes                         CRUD (admin)          ← written
GET    /colors                        CRUD (admin)          ← written
GET    /exchange-rates                list / by date
POST   /exchange-rates                manual entry (CBU fetch: open question)

GET    /products                      list, filter by category/active
POST   /products
PATCH  /products/:id
GET    /products/:id                  with variants

GET    /product-variants              list, filter by product/size/color/low-stock
POST   /product-variants              one or many: sizes × colour specs, existing skipped
PATCH  /product-variants/:id          sku, is_active
GET    /product-variants/:id          stock per grade, averages, ledger page

GET    /product-prices                current list, or as-of a given date
POST   /product-prices                new price row (the only way a price changes)
GET    /product-prices/variant/:id    full history for one variant

POST   /warehouse-product/opening     opening balance (multi-line)
POST   /warehouse-product/issue       OUT (multi-line)
GET    /warehouse-product/movements   ledger, filterable
GET    /warehouse-product/dashboard   counts, value (UZS/USD), low stock, recent

POST   /stocktakes                    start (snapshots system_qty)
PATCH  /stocktakes/:id/lines          fill counted quantities
POST   /stocktakes/:id/complete       writes ADJUSTMENTs, locks
```

There is no update and no delete endpoint for movements (D3), and none for prices either (D13) — a price changes by appending.

---

## 9. Frontend screens (`apps/admin`)

1. **Products list** — table: name, code, category, variant count, active. Uses `ResponsiveTable`.
2. **Product form** — name, code, category, notes **and** the size × colour matrix, in one form. Saving creates the product and then its variants — two calls, one screen. Variants are never created one at a time through a separate flow: a single variant is simply a 1 × 1 matrix.
3. **Adding variants later** — the same matrix re-opened on an existing product; combinations that already exist are skipped.
4. **Price list** — variant table with the current price; a row opens the three-field markup editor (percent · fixed · amount, live-linked). UZS/USD switcher. Shows both **markup** and **margin**, each labelled, because the two are routinely confused (30 % markup on 100 000 is a 23 % margin).
5. **Price history** — one variant's rows over time, with the cost basis beside each so margin erosion is visible.
6. **Variant card** — stock per grade, averages, ledger history (paginated).
7. **Opening balance** — multi-line form: variant, grade, qty, unit cost.
8. **Issue (OUT)** — multi-line, shows available stock per grade inline.
9. **Stocktake flow** — start → fill counted → review differences → complete.
10. **Reference CRUD** — categories, sizes, colors, exchange rates.
11. **Warehouse dashboard** — total pieces, stock value, low-stock list, recent movements.

Plus a CLI rebuild command (§6) that replays the ledger and reports drift.

---

## 10. Acceptance criteria (Definition of Done)

- [ ] A variant's SKU is generated from product + size + color, is unique, and stays editable.
- [ ] Creating a product with 4 sizes × 3 colors generates 12 variants in one action, skipping any that already exist; the `UNIQUE` constraint makes a duplicate impossible even if the generator is wrong.
- [ ] A price entered in USD freezes that date's rate; a later correction to that `exchange_rates` row does **not** alter it.
- [ ] Setting a price for a variant with no stock and no cost works, and stores `base_cost = NULL` with both markup caches `NULL`.
- [ ] A price dated in the future is invisible to "current price" until that date arrives — checked in Asia/Tashkent, not UTC.
- [ ] Two prices on the same date resolve to the later-inserted row.
- [ ] Asking for the price list "as of" a past date returns what was in force then.
- [ ] Editing a price is impossible through the API; the history shows both the old and the new row.
- [ ] Weighted average matches hand-computed values after a mixed sequence of INs at different prices and currencies (unit-tested).
- [ ] An OUT larger than the current stock of that (variant, grade) is rejected; stock never goes negative.
- [ ] Stock is tracked separately for A and BRAK; the average cost is the same for both (D6).
- [ ] Every movement row carries a `cost_source`; opening-balance rows are `MANUAL`.
- [ ] Completing a stocktake writes ADJUSTMENTs equal to counted − system per (variant, grade), valued at the current average, and locks the stocktake.
- [ ] `warehouse_product_balances` and `warehouse_product_costs` equal a from-scratch ledger replay — verified by truncating them and rebuilding.
- [ ] Role matrix enforced: warehouse keeper full access; workshop manager read-only (403 on writes); worker/sales 403 on writes.

---

## 11. Open questions (Phase 2)

| # | Question | Decide when |
|---|----------|-------------|
| 1 | CBU API details (endpoint, auth, fallback when unreachable) — shared with Phase 1. The realistic fallback is "freeze the most recent rate we have" | implementation |
| 2 | Does BRAK need its own selling price, or is it always negotiated per sale? Adding `grade` to `product_prices` later is cheap — the table is append-only, so old rows simply predate the column | after first real usage |
| 3 | Opening-balance correction policy — reversal document vs admin-only void | implementation (default: reversal) |
| 4 | When Phase 3 lands, do manual costs get recomputed from production, or stay as historical estimates? | Phase 3 design (default: stay) |
| 5 | A third markup kind, `MARGIN` — percentage of *price* rather than cost, which is what "rentabellik" means to an accountant. `base_cost / (1 − v/100)` | when the owner phrases a target as "keep 30 % of the price" rather than "add 30 % to the cost" |
| 6 | Price rounding step — should 113 750 be nudged to a round 114 000 automatically, or is the human's typed `amount` always final? Currently: always final | after the price form is used on real garments |
| 8 | **Low-stock threshold.** `min_stock` was dropped from `product_variants` (owner decision 2026-08-20: not needed). The dashboard's low-stock list therefore has no threshold to compare against — a product-level value, a global default, or dropping the list are the options | P2-4, when the dashboard is built |
| 7 | Does `products` need a translated `description` for the Phase 6 storefront? If yes, `translations` reshapes from `{"ru":"…"}` to `{"ru":{"name":"…","description":"…"}}` — a data migration over a few dozen rows, no `ALTER TABLE` | Phase 6 design |
| 8 | Bulk re-price ("fabric got more expensive, raise everything") — needs a *current* markup policy per variant or category, since the frozen per-row markup is a past description, not a present intention | when asked for, and after Phase 3 produces real costs |

---

## 12. Build order

Each step is usable on its own; the ledger step is the one that is expensive to get wrong.

1. **Reference data** — categories, sizes, colors *(written, migration pending)* + exchange rates *(entity written, module pending)*
2. **Catalog** — `products`, `product_variants`, SKU generation, matrix bulk-create
3. **Price list** — `product_prices`, the three-field markup form, as-of-date reads, history view
4. **Ledger + opening balance** — `warehouse_product_movements` + the two derived tables, weighted average, rebuild command ⚠
5. **Issue (OUT)** — negative-stock guard
6. **Stocktake** — snapshot → count → differences → ADJUSTMENT
7. **Dashboard** — counts, value, low stock, recent movements

Steps 1–3 make the price list usable, which is the owner's stated priority. Step 4 is where the design has to be right.
