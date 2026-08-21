# Barcode architecture — design

> **Status:** Approved 2026-08-18 · amended the same day after a second-model review · **implemented and verified 2026-08-20**
> **Scope:** One sub-project. Scanning identity only — not purchasing, not label printing, not selling.
> **Related:** `../../PHASE_2_FINISHED_GOODS.md` (D17, §5.1), `../../../BUSINESS_PLAN.md` (§8)

---

## 1. Why this exists

The sealed Phase 2 design put barcodes out of scope — *"revisit after real usage"*. That decision was made on the assumption that LIMONÉ only sews its own clothes. It does not:

- it **buys ready-made garments** to resell, which arrive already carrying a supplier's barcode;
- it **sews for other shops**, who need to scan what is delivered into their own systems;
- it sells both **online and from a physical shop**.

Goods with barcodes are arriving today, so the identity model has to exist today.

**What this is not.** "Marketplace" was clarified during the brainstorm: every garment — bought or made — enters *our* warehouse and is sold by *us*. There are no third-party sellers, no commissions, no payouts. That is a shop with a website, not a multi-vendor platform, and it is served by the existing Phase 5/6 plan.

## 2. What the owner needs

1. Receiving purchased goods: scan the supplier's barcode instead of typing a name.
2. Delivering to shops: they scan our label into their own system.
3. Selling: scan to find the item instead of typing.
4. Scanner broken: the same code must be typeable by hand.

## 3. Decisions

| # | Decision | Reason |
|---|----------|--------|
| B1 | Purchased goods **keep the supplier's label**. We record the code and link it to our variant | No printer, no relabelling step at goods-in |
| B2 | Our own garments get an **internal code now, a real EAN-13 later** | Internal costs nothing and works today; GS1 membership is a business decision, not a technical one |
| B3 | One variant may carry **several codes** — ours, one or more suppliers', later an EAN | Follows from B1 + B2; a single column cannot hold them |
| B4 | The internal code is **numeric with a check digit**, not the SKU | Need 4: typed on a numpad under time pressure, and a mistyped digit must be rejected rather than silently finding the wrong garment |
| B5 | `sku` stays as it is | `sku` is read by people, `barcode` by machines — the same split as `name`/`translations` and `code`/`sku` |
| B6 | `code → one variant` stays strict, even though some suppliers print **one EAN across all sizes**. The guard is UI, not schema: every screen that resolves a scan shows size and colour prominently and the clerk confirms. Product-level linking (`variant_id` nullable + `product_id`) is the designed escape hatch if shared EANs prove common | owner decision 2026-08-18; revisited at the goods-receipt design |

## 4. Data model

```sql
product_barcodes
   id
   variant_id   FK → product_variants   ON DELETE RESTRICT
   code         varchar(32)  UNIQUE
   type         INTERNAL | EAN13 | SUPPLIER
   note         varchar(255) null
   created_by   FK → users
   created_at

   UNIQUE (variant_id) WHERE type = 'INTERNAL'     -- partial index
```

**`code` is unique across the whole table, not per type.** A scanner hands over a bare string with no type attached; it has to resolve to exactly one variant or the lookup has no answer.

**Exactly one INTERNAL code per variant**, enforced by a partial unique index — the same mechanism `product_variants` already uses for its colour pair, and the same reason: it is expressible on the entity, so `migration:generate` keeps it. Other types are unconstrained: three suppliers shipping the same garment means three `SUPPLIER` rows.

**No `is_primary` column.** Which code goes on a printed label is a rule — the EAN if there is one, otherwise the INTERNAL code — and storing a derivable value invites drift.

**No `supplier_id` yet.** Suppliers are a Phase 1 table that does not exist. `note` carries the origin until then.

**No `is_active`.** A code that is wrong gets deleted; "an inactive barcode" is not a state this business has.

**`varchar(32)`** covers EAN-13 and every supplier code a garment label carries. GS1-128 strings with application identifiers can exceed it, but a counter scanner in keyboard-wedge mode emits the bare code; revisit only if a 2D scanner arrives (open question 4).

## 5. Code generation

### Format

Seven digits from `product_variants.id`, plus one check digit:

```
variant.id = 41
   →  0000041      padded to seven
   →         3     check digit
   →  00000413
```

Derived from `id` because it never changes, never repeats, and needs no separate counter. Seven digits covers ten million variants.

### Check digit — GTIN mod-10

Anchored **from the right**: the data digit nearest the check position always weighs 3, then alternating 1, 3, 1…

```
0000041 read right-to-left:  1, 4, 0, 0, 0, 0, 0
weights:                     3, 1, 3, 1, 3, 1, 3

1×3 + 4×1  =  7
check = (10 − 7 mod 10) mod 10 = 3      →  00000413
```

**The anchor direction is load-bearing.** Our seven data digits are an odd count, so left- and right-anchored weights happen to coincide — a left-anchored implementation would pass every test built on our own codes and then reject every real EAN-13, whose twelve data digits are an even count. Concretely, for the published example `4006381333931`: right-anchored sums to 89 → check 1 ✓; left-anchored sums to 83 → check 7 ✗. The shared function must be written right-anchored, and §9 pins it against published EAN-13 examples.

This algorithm rather than Luhn because EAN-13 codes will also need validating when they are entered, and EAN uses exactly this. One function serves both: it **generates** our code and **verifies** theirs.

Effect on manual entry:

```
00000413   →  found
00000414   →  rejected — one digit wrong
00000431   →  rejected — two digits swapped
```

Without it, a mistyped digit finds a different garment and nothing looks wrong.

### Symbology

Printed as **Code128, not EAN-8**. Seven-plus-one happens to be EAN-8's shape, but encoding it as EAN-8 makes a scanner announce it as a GTIN, which invites another system to look it up in a global registry where it does not exist. Code128 is neutral.

### Rejected: an EAN-13 in the internal range

GS1 reserves a prefix range for restricted distribution — a shop can mint its own valid EAN-13s that GS1 will never issue to anyone. Standards-clean, and rejected anyway: thirteen digits to type by hand is twice the work of eight, against need 4.

### When it is created

Automatically, when a variant is created. Nobody types it.

Label layout:

```
   ▮▯▮▮▯▮▯▮▮▯▮
    00000413            ← scanner reads this
  KOY01-M-QORA          ← person reads this
  Ko'ylak-01 · M · Qora
```

## 6. Lookup

### Endpoint

```
GET /product-variants/by-code?code=00000413
```

Declared **above** `:id`, or `by-code` reaches the id handler and 400s. This has now bitten twice in this codebase; it is a rule, not a detail.

### Three answers

```
200  found        the variant
404  unknown      "which garment is this?" → learn flow
400  malformed    "check the code and retype"
```

The distinction matters. If both misses returned 404, a clerk who mistyped a digit would conclude new goods had arrived and **link the wrong code to a garment** — a false association that then works silently forever.

### Order of evaluation

```
1. in the table?              → yes → 200
2. no. Does it match our internal shape (8 digits)?
      check digit fails       → 400
      anything else           → 404
```

Lookup comes first because a supplier's code may also be eight digits. If it has already been learned, step 1 answers and the diagnosis is never reached.

Even on 400 the UI still offers the learn action — worded as *"this code looks wrong, link it anyway"* — because the system can be mistaken and the clerk is holding the garment.

### Normalisation

```
received:  "  8690001234567\n"    scanners add whitespace and Enter
stored and compared:  "8690001234567"

rule: trim + uppercase, nothing else
```

Hyphens and other characters are left alone — they can be meaningful inside a supplier's code. Both write and read paths apply the same rule, so a code stored through one path is findable through the other.

### Learning

Not a special mechanism — an ordinary create:

```
scan → 404 → "which garment?" → clerk picks the variant
     → POST /product-barcodes { variantId, code, type: SUPPLIER }
     → next scan resolves on its own
```

The server refuses to learn any code that has **our own internal shape** — eight digits with a valid check digit — whatever type the client claims. Such a code belongs to a variant that may not exist yet; learning it would make that variant's creation fail later with a cause nobody would look for. Real EAN-8s are the price, negligible in garment trade (known accepted risks).

The client states the `type`; the server does not guess it. A thirteen-digit
code is not necessarily an EAN, and mislabelling one would make later GTIN
reporting wrong. The server does validate: a row sent as `EAN13` must be
thirteen digits with a correct check digit, or it is rejected. `INTERNAL` is
never accepted from a client at all — only the variant-creation path writes it.

One soft warning in the learn dialog: a thirteen-digit code that fails the GTIN
check shows *"looks like an EAN, but its check digit is wrong"* — informative,
not blocking, because supplier codes are arbitrary and the clerk is holding the
garment.

### One input, not two

When the scanner is broken (need 4), the clerk types into the same field:

```
"00000413"      → resolves as a code
"KOY01-M-QORA"  → not a code → falls through to SKU search
"ko'ylak qora"  → not a code → falls through to name search
```

One box. The clerk does not have to decide what they are typing.

**Only the first line is in this sub-project.** `by-code` resolves codes; the
fallback to SKU and name search is the existing variant list endpoint, and
wiring the two together is frontend work that ships with the screen that needs
it. The rule recorded here is that it must be *one field*, not two.

### The rest of the surface

```
GET    /product-variants/by-code?code=…    resolve a scan          readers
GET    /product-barcodes?variantId=…       codes on a variant card readers
POST   /product-barcodes                   learn a code            editors
DELETE /product-barcodes/:id               remove a wrong code     editors  (204)
```

`code` is read as `unknown`, not `string`: Express hands a repeated query key over as an array, and that has to be a 400, not a crash. `code` accepts Latin script only, like every other typed identifier in the catalog — a Cyrillic look-alike would be stored as dead data no scanner could ever match.

Roles are `CATALOG_READERS` / `CATALOG_EDITORS` — goods-in is done by the
warehouse keeper, who is already an editor. `INTERNAL` rows pass through
neither POST nor DELETE: they are born with the variant and live as long as it
does.

### Known accepted risks

| Risk | Why accepted | Guard |
|------|--------------|-------|
| A supplier prints **one EAN across all sizes**; our strict `code → one variant` then resolves every size to whichever one was learned first | Owner decision 2026-08-18 (B6). Product-level linking is the designed escape hatch, deferred until real supplier labels show it is needed | Scan-resolving screens show size and colour prominently; the clerk confirms, nothing auto-commits |
| A real EAN-8 could in theory equal one of our internal codes — in **either** direction: resolving to our variant, or, if learned first, squatting the internal slot of a variant not yet created and making its creation fail | Garment suppliers ship EAN-13s; leading-zero EAN-8s effectively do not occur | The reverse direction is **closed**: `learn()` refuses any code in our internal shape (eight digits, valid check digit), so no learned code can ever occupy a future internal slot — real EAN-8s are the accepted cost. Raw writes that bypass the API still surface as a 409 naming `product_barcodes` as the cause, not "variant exists". The forward direction stays as measured: negligible |

## 7. Out of scope

| Not here | Where | Why not now |
|----------|-------|-------------|
| Goods receipt document (buying finished garments) | its own sub-project | Needs the ledger, which does not exist yet. Larger than this |
| `brand` on products | small catalog change | Needed for resale, unrelated to scanning |
| Label printing | frontend | Code128 rendering plus a print layout |
| Stock shown on scan | P2-4 | `warehouse_product_balances` does not exist yet. An added field later, not a reshape |
| Scanning during a sale | Phase 5 | No order module yet |
| Buying EAN-13s | business decision | When it happens it is rows with `type = EAN13`, no schema change |

**The largest gap this brainstorm exposed** is the goods receipt. Phase 2 §2 pushes purchase documents to Phase 1, but that is about *raw materials*; buying finished garments has no home in the sealed design, and `cost_source = PURCHASE` (D5) has nothing that writes it. It needs its own brainstorm after P2-4.

## 8. Sequence

```
in flight   P2-2      products + variants — migration, e2e
 1.         BARCODES  ← this spec
 2.         brand
 3.         P2-3      price list
 4.         P2-4      warehouse ledger (+ stock on scan)
 5.         goods receipt
 6.         label printing
 7.         Phase 5   orders, scan to sell
 8.         Phase 6   storefront
```

Barcodes come first among the new work for one concrete reason: **the internal code is generated when a variant is created.** No variants exist yet, so there is nothing to backfill. Deferring it means writing a migration, a backfill script and a verification pass that today costs nothing. Every screen built afterwards also gets a scan field from the start instead of a retrofit.

## 9. Acceptance criteria

- [x] Creating a variant automatically creates exactly one `INTERNAL` barcode.
- [x] The matrix bulk-create writes one `INTERNAL` code per created variant, **in the same transaction** — a variant without its code is never observable.
- [x] The generated code is seven digits of the variant id plus a valid GTIN mod-10 check digit.
- [x] A second `INTERNAL` code for the same variant is rejected by the database.
- [x] The same code cannot be attached to two variants.
- [x] `by-code` returns 200 and the variant for a known code, whatever its type.
- [x] An unknown code returns 404; an eight-digit code with a bad check digit returns 400.
- [x] A known eight-digit supplier code with a "bad" check digit still returns 200 — lookup precedes diagnosis.
- [x] Whitespace and case differences do not change the result.
- [x] `checkDigit` is **right-anchored**: it validates published EAN-13 examples as well as generating ours.
- [x] A code learned through `POST /product-barcodes` resolves on the next lookup.
- [x] A row posted as `EAN13` that is not thirteen digits with a valid check digit is rejected.
- [x] A client posting `type = INTERNAL` is rejected; deleting an `INTERNAL` code is refused.
- [x] Deleting a variant that has barcodes is refused by the FK.

## 10. Open questions

| # | Question | Decide when |
|---|----------|-------------|
| 1 | Does any shop we sew for require a real EAN-13? That converts B2 from "later" to "now" | When the first shop asks |
| 2 | GS1 Uzbekistan membership cost and process — not verified here | Before buying EANs |
| 3 | Should a `SUPPLIER` code be removable once goods from that supplier are gone? | After real usage |
| 4 | QR instead of Code128 — QR holds more and scans from a phone camera, but needs a 2D scanner at the counter | When the counter hardware is chosen |
| 5 | Do suppliers actually share one EAN across sizes? If common, `SUPPLIER` codes gain product-level linking and lookup answers "product — pick the size" (B6's escape hatch) | At the goods-receipt design, with real supplier labels in hand |
