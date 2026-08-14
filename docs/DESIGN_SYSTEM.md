# Design System — LIMONÉ Admin

> **Status:** Design locked; shell, login, users and profile built
> **Last updated:** 2026-08-08 (§5 rewritten: radius overrides removed — Tailwind scale is the source, drawer radius exception, directional shadows, breakpoints & input; circular icon buttons tried and rejected. §9: `custom()` hand-drawn marks added)
> **Note:** This English document is canonical; `DESIGN_SYSTEM_UZ.md` is a translation.
> **Scope:** Internal admin dashboard. Customer storefront (Phase 6) may extend this.
> **Approach:** Full custom design tokens (not a preset). Light mode only.
> **Styling:** Tailwind CSS v4 (utility-first) + Ant Design v6 (component tokens), one shared palette.
> **Related:** `./FRONTEND_ARCHITECTURE.md`

---

## 1. Brand foundation

LIMONÉ APPAREL — a garment brand ("limone" = lemon, Italian). The brand world (hangtags, labels, bags, garment covers) is consistent: **cream / milky-yellow background + olive-citron green logo**, serif wordmark.

Design principles for the admin UI:

- **Calm and premium**, not loud. Plenty of whitespace.
- **Color encodes role, not decoration.** Olive = action; cream = brand surface; white = data area.
- **Readable first.** Data-dense tables and forms must stay legible — work area is white, brand color is an accent.
- **Brand felt, not shouted.** Olive and cream appear in chrome (sidebar, header, table headers, primary actions), never flooding the whole screen.

> The exact brand HEX values below were sampled from the logo artwork (no official brand-color document exists yet). The olive ramp was then tuned slightly darker than the raw logo green so that white button text passes WCAG AA (see §3). If a vector logo or brand book appears later, reconcile these tokens with the official values — print (labels) and screen must match.

---

## 2. Color tokens

### 2.1 Brand — Olive (primary ramp)

Derived from the logo's olive-citron green, tuned for accessibility. `600` is the primary action color; `400` is the raw logo accent (decoration only).

| Token | HEX | Use |
|-------|-----|-----|
| `olive-50` | `#F6F7EA` | Lightest tint, row hover |
| `olive-100` | `#E7EBC4` | Selected row, tag/badge fill |
| `olive-200` | `#D3DA96` | Borders on olive fills |
| `olive-300` | `#B9C264` | Decorative |
| `olive-400` | `#A8B04A` | **Raw logo accent** — decorative fills only, never text bg (see §3 warning) |
| `olive-500` | `#8A9340` | Decorative / accent hover |
| `olive-600` | `#6F762F` | **Primary** — buttons, links, active state (white text passes AA) |
| `olive-700` | `#5A6126` | Primary hover/pressed, selected menu bg, strong links |
| `olive-800` | `#454B1C` | Text on light/cream/tint surfaces, table header text |
| `olive-900` | `#2F3312` | Darkest, headings on tint |

### 2.2 Brand — Cream (surface ramp)

The milky-yellow brand background, used for chrome surfaces only — never as the data work area.

| Token | HEX | Use |
|-------|-----|-----|
| `cream-50` | `#FEFEF7` | Barely-there warm white |
| `cream-100` | `#FBF9E8` | **Sidebar, header, table header** background |
| `cream-200` | `#F5F1CF` | Cream borders/dividers |
| `cream-300` | `#ECE6B3` | Stronger cream edge |

### 2.3 Neutrals

| Token | HEX | Use |
|-------|-----|-----|
| `bg-base` | `#FFFFFF` | **Work area** — content, cards, tables |
| `bg-subtle` | `#F7F7F4` | Page background behind cards |
| `text-primary` | `#2C2E22` | Body text (warm near-black) |
| `text-secondary` | `#5F614E` | Muted labels, captions |
| `text-tertiary` | `#8A8B7C` | Hints, placeholders (UI/large only — see §3) |
| `border` | `#E6E6DD` | Default 1px borders |
| `border-strong` | `#CFCFC2` | Hover/emphasis borders |

### 2.4 Status (semantic — deliberately OUTSIDE the brand ramp)

Status colors must be visually distinct from brand olive, so users never confuse "success" with "brand color."

| Meaning | Fill | Text/Icon |
|---------|------|-----------|
| Success | `#EAF3DE` | `#3B6D11` |
| Warning | `#FAEEDA` | `#854F0B` |
| Danger | `#FCEBEB` | `#A32D2D` |
| Info | `#E6F1FB` | `#185FA5` |

---

## 3. Verified contrast (WCAG 2.1 AA)

Computed programmatically (sRGB relative luminance). AA: ≥ 4.5 for normal text, ≥ 3.0 for large text / UI components.

| Pair | Ratio | Verdict |
|------|------:|---------|
| White on `olive-600` `#6F762F` (button) | 4.65 | ✓ AA text |
| White on `olive-700` `#5A6126` (hover/selected) | 5.64 | ✓ AA text |
| Ink `#2C2E22` on white (body) | 13.81 | ✓ AA text |
| Ink on `cream-100` `#FBF9E8` (chrome) | 13.03 | ✓ AA text |
| `olive-800` `#454B1C` on `cream-100` (table header) | 8.48 | ✓ AA text |
| `olive-600` on white (link) | 4.65 | ✓ AA text |
| `olive-700` on white (strong link) | 5.64 | ✓ AA text |
| `text-secondary` `#5F614E` on white | 6.35 | ✓ AA text |
| `olive-800` on `olive-100` `#E7EBC4` (tag) | 7.27 | ✓ AA text |
| Success `#3B6D11` on `#EAF3DE` | 5.43 | ✓ AA text |
| Warning `#854F0B` on `#FAEEDA` | 5.87 | ✓ AA text |
| Danger `#A32D2D` on `#FCEBEB` | 6.13 | ✓ AA text |
| Info `#185FA5` on `#E6F1FB` | 4.65 | ✓ AA text |
| `text-tertiary` `#8A8B7C` on white | 3.31 | ✓ UI/large only (hints/placeholders) |
| **White on `olive-400` `#A8B04A`** | **2.34** | **✗ FAIL — never text** |

**Rules from this:**

1. `olive-400` (raw logo green) **never** carries text and is **not** a button/menu color — decorative fill only.
2. All actionable color uses `olive-600` (default) / `olive-700` (hover, selected).
3. `text-tertiary` is for placeholders/hints only (it's below 4.5); never use it for meaningful body text.

---

## 4. Typography

| Token | Value | Use |
|-------|-------|-----|
| `font-sans` | Inter (fallback: system-ui, -apple-system, "Segoe UI", Roboto) | All UI: tables, forms, body |
| `font-serif` | A serif near the logo (e.g. Cormorant Garamond / Playfair Display) | Logo wordmark, login title, page hero only |
| `font-mono` | ui-monospace, "SF Mono", Menlo | IDs, codes, SKUs |

Type scale (sans):

| Role | Size / line-height / weight |
|------|------------------------------|
| Display (login) | 32 / 1.2 / 500 |
| H1 page title | 22 / 1.3 / 500 |
| H2 section | 18 / 1.4 / 500 |
| H3 | 16 / 1.4 / 500 |
| Body | 14 / 1.6 / 400 |
| Small / caption | 12 / 1.5 / 400 |

Weights: **400 regular, 500 medium** only (no 600/700 — too heavy for a calm UI). Sentence case everywhere except the logo wordmark.

---

## 5. Spacing, radius, elevation

### 5.1 Spacing

**Scale (4px base):** `4, 8, 12, 16, 24, 32, 48`. Component-internal gaps in px; vertical section rhythm in multiples of 8.

### 5.2 Radius

**Tailwind's own scale, deliberately not overridden** (owner decision 2026-08-08). `@theme` sets colours, fonts and shadows but no radius:

| Tailwind class | Value | Use |
|----------------|-------|-----|
| `rounded-sm` | 4 | — |
| `rounded-md` | 6 | breadcrumb back, avatar, language-switch segment |
| `rounded-lg` | 8 | **controls** — buttons, icon buttons, nav items, inputs |
| `rounded-xl` | 12 | **containers** — cards, panels, dropdowns, table shell |
| `rounded-2xl` | 16 | — |
| `rounded-r-3xl` | 24 | **nav drawer trailing edge only** (see below) |
| `rounded-full` | pill | status chips, language switch, avatars — **not** buttons |

> **Why nothing is overridden.** `--radius-md: 8px` and `--radius-lg: 12px` used to be set here. That pushed `lg` onto 12px, the same value as Tailwind's native `xl` — so two class names rendered identically and `rounded-xl` silently meant "same as `lg`". Removing both overrides restores six distinct steps and, as a bonus, drops `rounded-lg` onto 8px, which is exactly Ant Design's own `borderRadius`. Hand-rolled buttons and AntD buttons now match; under the overrides they were 12 and 8 and did not.

**Control shape.** Every control is a rounded rectangle — icon-only ones included. Radius follows size, not whether the control carries a label. One shape per control at every breakpoint: a button that changes shape on resize reads as two different controls.

The result is a legible hierarchy without any special cases — **controls 8, the container holding them 12, the drawer over everything 24.** Each level is rounder than the one it sits inside.

> **Rejected 2026-08-08: circular icon buttons.** `rounded-full` on the icon-only controls (nav toggle, notifications, breadcrumb back, table row actions) was built and reviewed against the live app, then reverted — the owner's call. Pills read as foreign in a cream/olive system whose every other surface is a soft rectangle, and the circles competed with the language switch, which is a genuine pill. Recorded so it is not re-proposed as an obvious improvement.

**24px exception (owner decision 2026-08-08).** The nav drawer's trailing edge is `rounded-r-3xl`, above the 12px ceiling. It is the only element in the app that floats over a scrim at full viewport height, and 12px on a 248 × full-height panel disappears. Its leading edge stays square — it sits against the viewport, where a radius would leak background through. Above `lg` the same panel is part of the layout and drops the radius entirely (`lg:rounded-none`).

### 5.3 Elevation (very soft — premium, not heavy)

| Token | Shadow | Use |
|-------|--------|-----|
| `shadow-sm` | `0 1px 2px rgba(44,46,34,0.06)` | cards, table container |
| `shadow-md` | `0 2px 8px rgba(44,46,34,0.08)` | raised inline elements |
| `shadow-lg` | `0 8px 24px rgba(44,46,34,0.10)` | dropdown, modal, popover |
| `shadow-sidebar` | `4px 0 16px rgba(44,46,34,0.05)` | rail, `lg` and up — directional |
| `shadow-topbar` | `0 4px 16px rgba(44,46,34,0.05)` | topbar — directional |
| `shadow-drawer` | `8px 0 32px rgba(44,46,34,0.20)` | nav drawer below `lg` |

Prefer borders over shadows for separation; shadows only for overlays.

`shadow-drawer` is four times the opacity of the rest, deliberately: the drawer sits above a scrim that already darkens the page 40%, and a 5% edge shadow is invisible against it. Elsewhere that weight would be wrong.

### 5.4 Breakpoints & input

Two breakpoints, each set where its own content stops fitting — never at a device size.

| Breakpoint | What changes | Why there |
|------------|--------------|-----------|
| `lg` 1024 | Shell: rail ↔ overlay drawer | A 248px permanent rail leaves a 768px tablet ~520px for stock and order tables |
| `md` 768 | Tables: columns ↔ stacked list (`ResponsiveTable`) | Below this a six-column table can be scrolled but not read |

Input capability is a separate question from width, and answered separately:

- `pointer-coarse:` bumps interactive targets to **44px** (PRODUCT.md: sewing workers on phones). Applies regardless of viewport — a touchscreen laptop gets it too.
- `hover:` needs no guard. Tailwind v4 already compiles it to `@media (hover: hover)`, so touch devices never latch a hover state.
- `prefers-reduced-motion` restricts transitions to `opacity` and colour rather than killing them (`index.css`). Less movement, not less feedback.

---

## 6. Component usage map

| Surface | Token |
|---------|-------|
| App background | `bg-subtle` `#F7F7F4` |
| Content / cards / tables | `bg-base` white |
| Sidebar | `cream-100`; active item `olive-700` fill + white text; hover `olive-50` |
| Header / topbar | `cream-100`, bottom border `cream-200` |
| Table header row | `cream-100`, header text `olive-800` |
| Table row hover | `olive-50` |
| Selected row | `olive-100` |
| Primary button | `olive-600` bg, white text; hover `olive-700` |
| Secondary button | white bg, `border`, `text-primary`; hover `olive-50` |
| Link | `olive-600` (hover `olive-700`) |
| Tag/badge (brand) | `olive-100` bg, `olive-800` text |
| Status chips | §2.4 pairs |
| Focus ring | 2px `olive-600` at 40% opacity |

---

## 7. Ant Design v6 mapping (`ConfigProvider`)

Full custom tokens via `theme` in `ConfigProvider`, centralized in `src/app/theme.ts`. Light algorithm only.

### 7.1 Global `token`

```ts
const theme = {
  token: {
    colorPrimary:      '#6F762F',  // olive-600
    colorLink:         '#6F762F',  // olive-600
    colorLinkHover:    '#5A6126',  // olive-700
    colorSuccess:      '#3B6D11',
    colorWarning:      '#854F0B',
    colorError:        '#A32D2D',
    colorInfo:         '#185FA5',

    colorText:           '#2C2E22',
    colorTextSecondary:  '#5F614E',
    colorTextTertiary:   '#8A8B7C',
    colorBgBase:         '#FFFFFF',
    colorBgLayout:       '#F7F7F4',
    colorBorder:         '#E6E6DD',
    colorBorderSecondary:'#EFEFE8',

    borderRadius: 8,
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    boxShadow:          '0 2px 8px rgba(44,46,34,0.08)',
    boxShadowSecondary: '0 8px 24px rgba(44,46,34,0.10)',
  },
};
```

### 7.2 Per-component tokens (`components`)

```ts
components: {
  Layout: {
    siderBg:   '#FBF9E8',   // cream-100
    headerBg:  '#FBF9E8',
    bodyBg:    '#F7F7F4',
    headerHeight: 56,
  },
  Menu: {
    itemBg:            'transparent',
    itemSelectedBg:    '#5A6126',  // olive-700 (white text passes AA)
    itemSelectedColor: '#FFFFFF',
    itemHoverBg:       '#F6F7EA',  // olive-50
    itemColor:         '#454B1C',  // olive-800
    itemBorderRadius:  8,
  },
  Button: {
    primaryShadow: 'none',
    fontWeight: 500,
    controlHeight: 36,
  },
  Table: {
    headerBg:         '#FBF9E8',  // cream-100
    headerColor:      '#454B1C',  // olive-800
    rowHoverBg:       '#F6F7EA',  // olive-50
    rowSelectedBg:    '#E7EBC4',  // olive-100
    borderColor:      '#E6E6DD',
    cellPaddingBlock: 12,
  },
  Input:  { controlHeight: 36, activeBorderColor: '#6F762F', hoverBorderColor: '#8A9340' },
  Select: { controlHeight: 36 },
  Card:   { borderRadiusLG: 12 },
  Tag:    { defaultBg: '#E7EBC4', defaultColor: '#454B1C' },
}
```

> When AntD v6 renames a token vs. v5, prefer the v6 name; this file is the single place to adjust.

---

## 8. Tailwind CSS v4 + Ant Design

We use **Tailwind CSS v4** (latest) for layout, spacing, and our own components, alongside Ant Design for rich widgets. Tailwind v4 is CSS-first: configured in CSS via `@theme`, installed through the dedicated Vite plugin (`@tailwindcss/vite`) — no `tailwind.config.js`, no PostCSS step.

### 8.1 One palette, one source of truth

The olive/cream palette is defined **once** and consumed by both systems, so they never drift:

- `src/app/tokens.ts` — the canonical palette as a TS object. **AntD needs real hex** (it derives hover/active shades by color math, which it can't do on `var()`), so `theme.ts` imports these hex values.
- `src/index.css` — a Tailwind `@theme` block mirrors the same hex as Tailwind color tokens (`--color-olive-600`, `--color-cream-100`, …), which generates utilities like `bg-olive-600`, `text-olive-800`.

```css
@import "tailwindcss";

@theme {
  --color-olive-50:  #F6F7EA;
  --color-olive-100: #E7EBC4;
  --color-olive-400: #A8B04A;
  --color-olive-600: #6F762F;
  --color-olive-700: #5A6126;
  --color-olive-800: #454B1C;
  --color-cream-100: #FBF9E8;
  --color-cream-200: #F5F1CF;
  --color-ink:       #2C2E22;
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-serif: "Cormorant Garamond", Georgia, serif;
}
```

> If a value changes, change it in `tokens.ts` and the `@theme` block together (they hold the same hex). Treat `tokens.ts` as the authority; the `@theme` block mirrors it.

### 8.2 `@apply` rules (Tailwind v4)

- Prefer **utilities in markup** (`className="flex gap-4 …"`) over writing CSS.
- When a custom class earns its place (repeated pattern), build it with `@apply` in a CSS file.
- **v4 gotcha:** in any CSS file *other than* the one with `@import "tailwindcss"`, you must add `@reference "../index.css";` at the top, or `@apply` won't see the theme. Without it the build fails.

```css
@reference "../index.css";

.stat-card {
  @apply rounded-md border border-[--color-border] bg-white px-4 py-3;
}
```

### 8.3 Styling Ant Design — order of preference

1. **Design tokens first** — change AntD appearance via `theme.ts` (§7). This is the robust path and covers ~90% of cases.
2. **Tailwind utilities via `className`** on AntD components — fully supported and safe: `<Button className="mt-4 w-full">`, `<Card className="shadow-none">`.
3. **Overriding AntD internal `.ant-*` selectors with `@apply`** — last resort only. `.ant-*` class names are AntD internals and can change between versions, and AntD's CSS-in-JS creates specificity battles. If unavoidable, scope it and rely on cascade layers (next point) instead of `!important`.

### 8.4 Cascade layers (avoiding conflicts)

Two real conflicts and their fixes:

- **Tailwind Preflight vs AntD reset:** Tailwind's base reset can flatten AntD component styles (e.g. button borders). Fix with cascade-layer ordering so AntD's styles win where they should.
- **Override specificity:** wrap the app in `StyleProvider` (from `@ant-design/cssinjs`) with the `layer` prop so AntD styles sit in a named cascade layer; Tailwind v4 also emits into layers. Define the order once (e.g. `@layer tailwind-base, antd, tailwind-utilities;`) so utilities can override AntD **without** `!important`.

This keeps AntD theming token-driven and Tailwind as the layout/utility layer, with a predictable cascade.

---

## 9. Logo & iconography

### Logo

- **Wordmark** "LIMONÉ" in `font-serif`, color `olive-600`; tagline "APPAREL" in letter-spaced sans, `olive-700`. Used in the sidebar header and the login screen.
- Do **not** set the rest of the UI in serif — serif is reserved for the wordmark and login hero.
- Provide the logo as **SVG** (crisp at any size). Keep clear-space equal to the cap height around it.

### Iconography (locked 2026-08-01)

- **Primary set: Phosphor** (`@phosphor-icons/react`). Chosen for its weight system (regular / fill / duotone) and full garment-domain coverage (needle, t-shirt, swatches, coat-hanger). Comparison board that backed the decision: `apps/admin/public/icon-preview.html`.
- **Approved fallback: Heroicons** (`@heroicons/react`) — per-icon exceptions only, when no Phosphor glyph fits. Try Phosphor alternatives first (9 000+ glyphs). One visual language per row: icons sitting in the same row of equal-hierarchy items (nav list, toolbar, menu) must all come from one set.
- **Single registry rule:** components never import an icon library directly. Every icon goes through `apps/admin/src/shared/icons.tsx` — semantic names (`Icons.edit`, `Icons.logout`), `ph()` / `hero()` / `custom()` adapters normalizing every source to one `IconProps` interface, and `MODULE_ICONS` keeping sidebar and module placeholders in sync. Swapping any glyph (including to Heroicons) is a one-line registry change; call sites never change.

#### Hand-drawn marks (`custom()`, added 2026-08-08)

A third source, after Phosphor and Heroicons, for shapes **neither set carries**. Currently one user: `Icons.sidebar`, the nav toggle — three bars with the last one short. Phosphor has no three-bar ragged variant (`List` is three equal bars, `TextAlignLeft` is four alternating), so it was drawn.

Reach for it only after both sets have been searched. When you do, the drawing is **not** freehand — match Phosphor's geometry so the mark reads as one of the set rather than a later addition in a different weight:

| Constraint | Value | Why |
|------------|-------|-----|
| `viewBox` | `0 0 256 256` | Phosphor's own canvas; anything else changes the apparent stroke weight |
| Bar / stroke thickness | 16 units | matches `regular` |
| Cap radius | 8 (`a8,8,0,0,1,0,16`) | Phosphor's rounded-cap idiom |
| Safe margin | 40 units from each edge | where `List`, `TextAlignLeft` and siblings start |

Borrow the actual coordinates of the nearest sibling icon rather than inventing them — `Icons.sidebar` reuses `List`'s y centres (64 / 128 / 192) and starts at its x=40, running the two long bars to 256 and stopping the short one at 192. That is the whole reason it sits correctly beside 30 imported glyphs.

`custom()` is single-weight on purpose: a mark defined by one path has no `fill` variant, so `weight` is accepted and ignored. Never give a hand-drawn mark to an active nav item, which relies on `weight="fill"`.
- **Weights:** `regular` by default; `fill` for the active nav item. The `hero()` adapter maps `weight="fill"` to the solid variant, so the active pattern survives a library swap. Don't mix weights within one row of equal items.
- **Sizes** (`size` prop, px): nav items 19, dropdown menu items 17, buttons 15–17, input prefixes 15–16, empty/error state art 26–30. Icon-only buttons keep the ≥ 36px hit area from §10.
- **Color:** `text-ink-tertiary` by default in chrome, `olive-700` on hover (via `group-hover`), white on active/olive surfaces. Icons never introduce colors outside the palette.

---

## 10. Accessibility rules

- Maintain the verified contrasts in §3. Never put text on `olive-400`.
- Don't rely on color alone for status — pair the color with a label or icon (e.g. "Low" + amber chip).
- Visible focus ring on every interactive element (§6).
- Minimum interactive target 36px height; on **worker mobile-first screens** (see `FRONTEND_ARCHITECTURE.md` §11.1) targets are ≥ 44px.
- Body text never below 12px; `text-tertiary` only for hints/placeholders.

---

## 11. File layout (frontend)

```
apps/admin/src/
  app/
    tokens.ts           # canonical palette as TS object (authority; AntD needs real hex)
    theme.ts            # AntD ConfigProvider tokens — imports from tokens.ts
  index.css             # @import "tailwindcss" + @theme block (mirrors tokens.ts)
```

- `tokens.ts` is the single authority for the palette.
- `theme.ts` imports those hex values for AntD.
- The `@theme` block in `index.css` mirrors the same hex, exposing Tailwind tokens (`--color-olive-600`, …) → utilities (`bg-olive-600`, `text-ink`).
- Component CSS files that use `@apply` start with `@reference "../index.css";`.

---

## 12. Next step

Use these tokens when scaffolding `apps/admin`: create `app/tokens.ts` + `app/theme.ts` + `index.css` (`@import "tailwindcss"` + `@theme`), install Tailwind v4 via `@tailwindcss/vite`, wrap the app in `ConfigProvider theme={theme}` (and `StyleProvider` with layers), then build the Phase 0 screens (login, dashboard shell, users) on this system.
