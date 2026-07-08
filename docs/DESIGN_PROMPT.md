# Design Prompt — LIMONÉ Admin (paste into Claude)

> Copy everything inside the line below into Claude to generate the UI mockups.
> Build the visuals first; we write production code afterward.

---

You are a senior product designer. Design the UI for an **internal admin dashboard** for a garment (clothing) workshop business. Produce **high-fidelity, interactive mockups** as a single self-contained React artifact (or HTML if simpler). This is a **design exploration** — visuals and layout only, not production code, no backend calls. Use realistic placeholder data.

## The business

**LIMONÉ APPAREL** — a clothing company that (1) sells ready-made garments and (2) tailors custom garments in its own workshop. This is **not** a customer storefront; it is the **internal back-office ERP** used by staff: raw-material inventory, finished-goods inventory, production tasks, payroll, and orders. The admin panel is the core product.

For this design round, focus on **Phase 0 (foundation) screens** plus the shell that everything else will live in. Design it so future modules (materials, production, orders) can slot into the same layout.

## Screens to design

1. **Login** — username + password. Branded, calm, centered card on a soft background. Brand wordmark on top. (Note: login is by **username**, not email.)
2. **Dashboard shell** — the persistent frame:
   - Left **sidebar**: brand wordmark at top, vertical nav with icons + labels. Nav items (with placeholder icons): Dashboard, Material inventory, Finished goods, Production, Staff, Orders, Reports. The active item is clearly highlighted.
   - **Top bar**: page title on the left; on the right a **language switcher (UZ / RU / EN)**, a notifications bell, and a user menu (avatar + name + role + logout).
   - **Content area** on a clean white work surface.
3. **Staff (Users) list** — admin-only management screen: a data table of staff with columns: Name, Username, Role, Phone, Status (active/inactive), Actions (edit, deactivate). Include search, a role filter, pagination, and a primary "Add staff" button. Show ~8 placeholder rows covering all roles.
4. **Staff create / edit form** — fields: First name, Last name, Username, Phone (optional), Email (optional), Role (select), Active (toggle), Password (on create). Show inline validation states. Present it as a drawer or modal over the list.
5. **Empty + loading + error states** for the table (show these as small variations).

Roles in the system (for the Role select and filters): **Admin, Warehouse keeper, Workshop manager, Worker, Sales.**

## Brand & visual direction

The brand world is **cream / milky-yellow backgrounds with an olive-citron green logo**, serif wordmark — premium, calm, understated. Translate this into a UI that is **calm and readable first, brand-accented second**. Color encodes role: olive = action, cream = brand chrome surfaces (sidebar, header, table headers), white = the data work area. Never flood the whole screen with cream or olive.

**Light mode only.** No dark mode.

### Exact color tokens (use these precisely)

Olive (brand / action):
- olive-50 `#F6F7EA` (row hover, tint)
- olive-100 `#E7EBC4` (selected row, tag fill)
- olive-400 `#A8B04A` (raw logo accent — decoration only, NEVER as a background behind text)
- olive-600 `#6F762F` (PRIMARY — buttons, links, active state; white text on it is AA-legible)
- olive-700 `#5A6126` (hover/pressed, selected sidebar item, strong links)
- olive-800 `#454B1C` (text on light/cream surfaces, table header text)

Cream (brand chrome surfaces only):
- cream-100 `#FBF9E8` (sidebar, top bar, table header background)
- cream-200 `#F5F1CF` (cream borders/dividers)

Neutrals:
- white `#FFFFFF` (work area, cards, tables)
- bg-subtle `#F7F7F4` (page background behind cards)
- text-primary `#2C2E22` · text-secondary `#5F614E` · text-tertiary `#8A8B7C` (hints only)
- border `#E6E6DD`

Status (kept deliberately distinct from brand olive, so "success" never reads as "brand"):
- success: fill `#EAF3DE`, text `#3B6D11`
- warning: fill `#FAEEDA`, text `#854F0B`
- danger:  fill `#FCEBEB`, text `#A32D2D`
- info:    fill `#E6F1FB`, text `#185FA5`

Component mapping: app bg = bg-subtle; content/cards/tables = white; sidebar & top bar = cream-100; active sidebar item = olive-700 fill + white text; sidebar hover = olive-50; table header = cream-100 with olive-800 text; row hover = olive-50; selected row = olive-100; primary button = olive-600 (hover olive-700); secondary button = white + border + text-primary; links = olive-600; brand tag/badge = olive-100 fill + olive-800 text; status chips = the pairs above; focus ring = 2px olive-600 at ~40% opacity.

### Typography

- UI font: **Inter** (or a clean humanist sans) for everything — tables, forms, body.
- Serif **only** for the "LIMONÉ" wordmark and the login hero (e.g. Cormorant Garamond / Playfair Display). "APPAREL" tagline in letter-spaced sans.
- Scale: page title 22 / section 18 / body 14 / caption 12. Weights: 400 and 500 only (no bold-heavy 600/700). **Sentence case everywhere** except the wordmark.

### Shape & depth

- Radius: 8px buttons/inputs/cards, 12px panels/modals, pill for status chips.
- Very soft shadows, used only for overlays (dropdown, modal). Prefer 1px borders for separation.
- Generous whitespace. Inputs/buttons ~36px tall.

## Functional details to reflect visually

- **Role-based nav**: imply that a non-admin would see fewer items (you may show the admin view, but note which items are admin-only).
- **Trilingual**: the language switcher (UZ default, then RU, EN) must be visible; you can show labels in Uzbek by default with the switcher present.
- **Status as chip + label**, never color alone (e.g. "Active" green chip, "Inactive" gray chip).
- The look should feel like a **polished Ant Design** app themed with the palette above (we will build it with Ant Design v6 + Tailwind), but you are free to render the mockup however is cleanest.

## Constraints

- Light mode only; calm and premium; **simple but not bare**.
- Maintain readable contrast (the olive-600 / olive-700 / cream / status pairs above are already AA-checked — don't put text on olive-400).
- No emojis. Use a consistent outline icon set.
- Realistic placeholder data in Uzbek/English (names, materials, roles).
- Deliver as one interactive artifact; make the sidebar nav and the "Add staff" drawer clickable if feasible.

## What I want back

1. The **login** screen.
2. The **dashboard shell** with the **Staff list** populated.
3. The **Staff create/edit** drawer/modal.
4. A short note on any design decisions or trade-offs you made.

Start with the dashboard shell + Staff list (the most important), then the login, then the form.
