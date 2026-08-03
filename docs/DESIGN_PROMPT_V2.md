# Design Prompt V2 — LIMONÉ Admin (paste into claude.ai/design)

> V1 (`DESIGN_PROMPT.md`) produced a correct but *safe* result — a well-tokened
> generic admin. V2 exists because the owner wants character, not a template.
> Attach `apps/admin/src/assets/logos/limone-logo.svg` when running this prompt.

---

You are a senior product designer with strong editorial taste. Redesign the UI
of **LIMONÉ Admin** — the internal ERP of a garment atelier in Tashkent — as a
single self-contained interactive prototype (HTML + React, split into small jsx
files). Design exploration only: realistic placeholder data, no backend.

## The bar

This is **product UI** (staff in a work task), so the test is *earned
familiarity*: a user fluent in Linear/Notion-grade tools should trust every
control instantly — yet the interface must be unmistakably LIMONÉ. If a
screenshot could belong to any AntD/Bootstrap admin, the design has failed.
The previous round failed exactly this test. Do not repeat it.

## Committed direction — "Atelier ledger"

One direction, fully committed (not a mood-board of options):

The admin is a **premium tailor's workbook**. Think: the calm of a cutting
table, the precision of a measurement ledger, the tactility of hangtags and
fabric swatches — translated into a disciplined data UI, never a costume.

Concretely:
- **Chrome is warm paper, work is white.** Cream (`#FBF9E8`) sidebar/topbar/
  table headers; pure white data surfaces on `#F7F7F4`; generous whitespace.
- **The ledger feel comes from typography and rulings, not decoration.**
  Tabular numerals everywhere numbers appear; hairline row rulings; column
  labels small, letterspaced, `#454B1C` on cream; baseline-disciplined rows.
- **Serif is a scalpel.** Cormorant Garamond appears ONLY as: the logo lockup
  (use the attached SVG), oversized page heroes (e.g. a 28–32px serif page
  title over the sans crumb), and large numerals on dashboard stat lines.
  Everything else is Inter 400/500 — never 600/700.
- **Hangtag motif for statuses and roles**: chips shaped like small garment
  tags (subtle notch or punched-hole dot), olive-100 fill for roles, the
  status palette below for states. One motif, used consistently — this is the
  signature detail, so craft it beautifully and keep it quiet.
- **Swatch avatars**: user initials on small rounded "fabric swatch" squares
  (olive-100 base, occasional cream), not circles — a second quiet signature.
- **Olive is the only voice of action.** `#6F762F` buttons/links/active
  states, `#5A6126` hover/selected. Nothing else may compete for "clickable".

## Brand anchors (do not renegotiate)

- Palette (exact): olive-50 `#F6F7EA` · 100 `#E7EBC4` · 400 `#A8B04A`
  (decoration only, NEVER under text) · 600 `#6F762F` · 700 `#5A6126` ·
  800 `#454B1C`; cream-100 `#FBF9E8` · 200 `#F5F1CF`; white; bg `#F7F7F4`;
  ink `#2C2E22` / `#5F614E` / `#8A8B7C` (hints only); border `#E6E6DD`.
- Status (never brand olive): success `#3B6D11`/`#EAF3DE`, warning
  `#854F0B`/`#FAEEDA`, danger `#A32D2D`/`#FCEBEB`, info `#185FA5`/`#E6F1FB`.
- Light mode only. WCAG AA on every text pair (white on olive-600 passes;
  olive-400 never carries text). Focus ring: 3px `rgba(111,118,47,.4)` on
  every interactive element.
- Radii 8/12, soft shadows only for overlays; prefer borders for separation.

## Screens (uz strings by default; structure for RU/EN too)

1. **Login** — keep the centered-card concept but make it feel like opening
   the atelier's ledger: logo lockup, one quiet brand line, username+password
   (login by username, not email), forgot-password link, footer line.
2. **Shell** — cream sidebar (logo, 7 modules: Boshqaruv paneli, Xomashyo
   zaxirasi, Tayyor mahsulot, Ishlab chiqarish, Xodimlar 🔒, Buyurtmalar,
   Hisobotlar 🔒; lock = admin-only), org card footer; topbar (crumb + serif
   page hero, UZ/RU/EN segmented switch, bell, user menu with logout).
3. **Dashboard home** — NOT a placeholder: a working "day at the atelier"
   view with placeholder data. A greeting line, 3–4 ledger-style stat lines
   (large serif numerals: bugungi bichim, tikuvda, tayyor, kam qolgan mato),
   a "kam zaxira" list, an "oxirgi harakatlar" feed. No hero-metric card
   grid — compose it like a ledger page, asymmetric, typographic.
4. **Staff list** — table: Ism (swatch avatar + name + @username), Login,
   Rol (hangtag chip), Telefon, Holat, Amallar (edit / power). Search, role
   filter, pagination ("Ko'rsatildi 1–8 / 23 xodim"), Add button. Show
   loading (skeleton rows), empty, and error states as variations.
5. **Staff drawer** — create/edit over the list: Ism/Familiya, @login,
   Rol select, Telefon/Email (ixtiyoriy), Parol (create only, min 8), Faol
   toggle (edit only), inline validation, cancel/save footer.
6. **Change password screen** — joriy parol, yangi parol ×2, calm success
   state.

Roles: Administrator, Ombor mudiri, Ustaxona menejeri, Ishchi, Sotuv.

## Motion (restrained, product-grade)

150–250ms, ease-out (cubic-bezier(.22,1,.36,1)). Motion conveys state only:
drawer slide-in, row hover tint, toast rise, skeleton shimmer. No page-load
choreography, no bounce, no parallax. Respect `prefers-reduced-motion`.

## Absolute bans

Gradient text · glassmorphism · side-stripe accent borders · hero-metric
card template · identical icon-card grids · uppercase tracked eyebrows on
every section · spinners centered in content (use skeletons) · gray text on
cream (use olive-800 or ink) · serif in controls/labels/body · dark mode ·
any layout that would look at home in a generic admin template.

## Deliverable

Single `LIMONÉ Admin.html` + `src/*.jsx` (icons, i18n, ui, login, shell,
dashboard, staff, drawer, app) — same file structure as the previous round so
the team can diff. All three languages in one STR object, uz default.
