# Frontend Architecture — Admin Dashboard

> **Status:** Design locked, build started
> **Deviation (2026-07-25):** Nx is **deferred** (owner decision — learn the fundamentals on standalone projects first; `BUSINESS_PLAN.md` §12 #6). `apps/admin` currently runs as an independent Vite project with its own `package.json`; the API stays at the repo root. Zod schemas are temporarily duplicated on the FE until `libs/shared` exists.
> **Last updated:** 2026-08-06
> **Scope:** Internal admin dashboard (Phase 0 onward), living at `apps/admin` in the Nx workspace. Customer storefront is a separate app (Phase 6, `apps/storefront`).
> **Related:** `./PHASE_0_FOUNDATION.md`, `../BUSINESS_PLAN.md` (§9 repo structure & API contract)
> **Note:** This English document is canonical; `FRONTEND_ARCHITECTURE_UZ.md` is a translation.

---

## 1. Goal & scope

Build the internal **admin dashboard** for the workshop ERP: a role-gated, data-heavy CRUD application that consumes the NestJS API. This document defines the stack, structure, and conventions the dashboard grows on, phase by phase.

The customer-facing storefront (Phase 6) is intentionally **out of scope here** — it will be a separate application (likely Next.js for SEO).

---

## 2. Tech stack (locked)

| Concern | Choice | Why |
|---------|--------|-----|
| Workspace | **Nx (integrated) + npm** — this app is `apps/admin` | Task caching, affected-only CI, enforced module boundaries; shares `libs/shared` with the API (see `BUSINESS_PLAN.md` §9) |
| Framework | **Vite + React 19 + TypeScript** (SPA) | Internal tool — no SSR/SEO need; simplest, fastest; clean separation from NestJS API. Latest: Vite 8.x, React 19.x |
| UI library | **Ant Design (v6)** | Rich Table/Form/DatePicker out of the box — ideal for ERP CRUD. v6 (stable since Nov 2025, latest 6.4.x) supports React 18/19; smooth migration from v5 |
| Styling | **Tailwind CSS v4** (utility-first) | Layout, spacing, custom components. CSS-first config (`@theme`), `@tailwindcss/vite` plugin. Shares one palette with AntD tokens. See `DESIGN_SYSTEM.md` §8 |
| Routing | **React Router (v8, declarative mode)** | Standard SPA routing. Upgraded v6 → v8 on 2026-08-03: the open-redirect CVE fixes (GHSA-wrjc-x8rr-h8h6 et al.) ship only in v7.18+/v8 and were not backported to v6; our declarative API surface (`BrowserRouter/Routes/Route/useNavigate`) is unchanged. Import from `react-router` — the `react-router-dom` package is gone in v8. Redirect targets from router state go through `shared/safePath.ts` |
| Server state | **TanStack Query (React Query)** | Caching, refetch, mutations — covers ~90% of state needs |
| Client/UI state | **Zustand** (light) | Minimal: auth/session, UI prefs. No Redux |
| HTTP client | **Axios** | Interceptors for JWT attach + 401 handling |
| Forms & validation | **React Hook Form + Zod schemas from `libs/shared`** | The *same* Zod schemas the API validates with (`nestjs-zod`) — one rule, one place, zero FE/BE drift |
| i18n | **react-i18next** | UZ / RU / EN |
| Auth tokens | **Access + refresh** (Variant B), stored in **localStorage** | Sliding session: active → stays logged in; idle 2h → logout. Persists across tab/browser close |

---

## 3. Project structure (feature-based)

Folders mirror backend modules. Each feature is self-contained (`api`, `hooks`, `components`, `pages`). The app lives at `apps/admin` inside the Nx workspace; cross-cutting contract code (Zod schemas, enums, role matrix, API types) is imported from `libs/shared`, **never** redefined here.

```
apps/admin/
  index.html
  package.json                 # standalone project (Nx deferred — see header)
  vite.config.mts
  .env                         # VITE_API_BASE_URL
  public/                      # design-system.html, icon-preview.html (reference boards)
  src/
    main.tsx
    index.css                  # Tailwind v4 @theme — colours, shadows, fonts
    assets/logos/              # brand marks (SVG + PNG)
    app/
      providers.tsx            # QueryClient, AntD ConfigProvider, i18n, Router
      router.tsx               # route definitions + role guards
      queryClient.ts           # staleTime and other query defaults
      theme.ts, tokens.ts      # AntD theme fed from the same tokens as index.css
    config/
      env.ts                   # reads import.meta.env (typed)
    shared/
      api/axios.ts             # axios instance + request/response interceptors
      session/                 # how long a signed-in session lives (§5)
        activity.ts            # human-activity tracking, idle maths, tab lock
        token.ts               # reads the access token's stated lifetime
        endSession.ts          # closes the session on server, storage and tab
      components/              # Avatar, Hangtag, Req, PasswordStrength, ErrorBoundary…
      access.ts                # role x module matrix (single source for guards + nav)
      icons.tsx                # icon registry — the only file importing an icon library
      password.ts, phone.ts, safePath.ts
      i18n/index.ts, i18n/locales/{uz,ru,en}.json
    layouts/
      DashboardLayout.tsx      # sidebar + topbar + content, mounts the session hook
      AuthLayout.tsx           # login screen layout
      Sidebar.tsx, Topbar.tsx, UserMenu.tsx, Breadcrumbs.tsx
      nav.ts                   # nav items, derived from access.ts
    pages/
      DashboardHomePage.tsx
    features/
      auth/
        api/authApi.ts         # login, refresh, logout, me, change-password
        store/authStore.ts     # zustand: tokens + user + idle window
        hooks/useSessionKeepAlive.ts   # renew while active, warn, then sign out
        components/RequireAuth.tsx     # route guard (logged in)
        components/RequireRole.tsx     # route guard (role allowed)
        components/IdleWarning.tsx     # the countdown panel
        pages/LoginPage.tsx
        schemas/login.schema.ts
      profile/                 # own account: details, password, sessions
        api/profileApi.ts
        components/{PersonalInfoCard,PasswordCard,SessionsCard}.tsx
        pages/ProfilePage.tsx
        schemas/{update-profile,change-password}.schema.ts
        lib.ts                 # device labels, date formatting
      users/                   # Phase 0: user management (admin only)
        api/usersApi.ts
        components/UserDrawer.tsx      # create + edit in one drawer
        pages/UsersPage.tsx
        schemas/user-form.schema.ts
      # later phases: materials/, products/, production/, wages/, orders/...

Tests sit next to what they test (`*.test.ts`) and cover pure logic only —
access matrix, safePath, phone, password, session activity and token.
```

---

## 4. Routing & layout

- **`AuthLayout`** — minimal layout for the login page.
- **`DashboardLayout`** — sidebar navigation + topbar (current user, language switcher, logout) + content area.
- Routes are grouped: public (`/login`) and protected (everything under the dashboard).
- **Protected routes** wrap elements in `RequireAuth` (must be logged in) and `RequireRole` (role permitted) — otherwise redirect to login or show a 403 page.
- The **sidebar menu is role-filtered**: each item declares allowed roles; only items the current user's role permits are shown (driven by the authorization matrix in `PHASE_0_FOUNDATION.md` §6).

---

## 5. Authentication & token handling

> **Revised 2026-08-06.** The sliding-session model is unchanged, but three
> things named below were built since the first draft: idle is now measured
> from *human activity* rather than HTTP traffic, the access token is checked
> against server state on every request, and the idle window is served by the
> API instead of being restated in the frontend. Implementation notes and the
> failures that shaped them: `FRONTEND.md`, `NESTJS.md` §13–§15.

**Model — Variant B (sliding session).** Two tokens: a short-lived **access
token** (~15m) sent on every request, and a **refresh token** whose lifetime is
the **2h inactivity window**. Continued activity refreshes the access token and
restarts the 2h window → the user stays logged in indefinitely. Idle for 2h →
the session ends. Both lifetimes live on the backend (`ACCESS_TOKEN_TTL`,
`REFRESH_TOKEN_TTL`); the frontend never restates them.

**Login flow.** `POST /api/auth/login { username, password }` →
`{ accessToken, refreshToken, sessionIdleMs, user }`. Store in `localStorage`
and hydrate the `authStore` (Zustand).

`sessionIdleMs` is the idle window the API will actually honour, computed from
the refresh row just issued and sent as a **duration, never a timestamp** —
adding it to the browser's own clock avoids comparing two machines' clocks.
Changing `REFRESH_TOKEN_TTL` therefore needs an API restart and no frontend
rebuild.

**Persistence.** `localStorage` survives tab and browser close, so an active
session continues after a reload. A `storage` listener rehydrates the store in
**other tabs**: without it a second tab keeps serving a token the first tab has
already rotated, and replaying a rotated token is treated as theft.

**"Active" means a human, not a request.** The client listens for `pointerdown`,
`keydown`, `wheel` and `touchstart`, and stores the last-activity timestamp in
`localStorage` (shared by every tab). `mousemove` is excluded on purpose: a
nudged desk is not someone working, and counting it would keep an abandoned
laptop signed in — the exact thing the rule exists to prevent.

This distinction is load-bearing. Any polling in the app (the sessions list
refetches every 30s) would otherwise answer its own `401` with a refresh and
keep an abandoned tab alive forever.

**While a human is active** the access token is renewed *before* it expires, so
a long form is never lost to a `401` on save. The renewal is gated by a
cross-tab lock, because tabs share one token and therefore reach the margin at
the same moment.

**Approaching the limit** (2h minus 2 minutes) a countdown appears — a bottom
panel, not a modal: any real interaction resets the idle clock, so someone at
the desk answers it simply by carrying on working. At the limit the client ends
the session itself, revoking the row server-side so it leaves the device list
immediately, and redirects to `/login?reason=idle`.

**Axios interceptors.**
- *Request:* attach `Authorization: Bearer <accessToken>`.
- *Response:* on `401`, first check whether the idle window has already passed —
  if so end the session instead of refreshing (this is what stops background
  polling from resurrecting a dead session). Otherwise call
  `POST /api/auth/refresh { refreshToken }`, store the new tokens and **retry
  the original request**; on failure clear auth and redirect to `/login`.

**Single-flight refresh.** Concurrent 401s share one in-flight refresh call and
queue their retries, so the token is refreshed once, not N times. The proactive
renewal above calls the same function, so the two paths cannot race.

**On app startup.** Read tokens from storage; if present, hydrate the session
optimistically — the first request reconciles validity. If no tokens → logged
out.

**Server-side session check.** A signed access token alone is not enough: the
API also verifies that the session row named by the token's `sid` claim is
still live. Without it "sign out other devices" only blocked the *next*
refresh, and the revoked device kept working for the rest of its 15 minutes.
The cost is one primary-key lookup per request.

**Rate limiting.** `POST /auth/login` and `POST /auth/change-password` are
throttled per **(account, IP)** — not per IP alone, because the whole workshop
shares one office address and an IP-only limit would let one person's typos
lock out everyone. The UI maps `429` to its own message rather than the generic
error.

**Security note.** localStorage means an XSS could read the tokens. Acceptable
for an internal tool, mitigated by React's default escaping and careful
dependencies. **A Content-Security-Policy is not yet in place** — it is the
largest remaining gap here, and it depends on the undecided deploy target
(`BUSINESS_PLAN.md` §12 #2) because the admin bundle is not served by our nginx
today. Auth/token logic is centralized (one `authStore` + the Axios
interceptor), so the **refresh token can later move to an httpOnly cookie** in
isolation — recommended for the more-exposed storefront in Phase 6.

---

## 6. API layer

- A single Axios instance in `shared/api/axios.ts` with `baseURL = VITE_API_BASE_URL` and the interceptors above.
- Each feature has an `api/*.ts` module exposing typed functions (e.g. `usersApi.list()`).
- **TanStack Query** wraps these: `useQuery` for reads, `useMutation` for writes, with query-key invalidation after mutations. Loading/error/empty states handled by Query.

---

## 7. State management

- **Server state → TanStack Query.** All API data (users, later materials/orders…) lives in the Query cache. No manual global store for server data.
- **Client/UI state → Zustand.** Only what isn't server data: auth/session (token, current user), UI preferences (selected language, sidebar collapsed). Kept tiny.
- **No Redux** — unnecessary for this app's complexity.

---

## 8. Forms & validation

- **React Hook Form** for form state; **Zod** schemas for validation (and reusable as TypeScript types).
- Ant Design inputs are wired to RHF via `Controller`. AntD's own `Form` may be used for simple cases; RHF + Zod is the default for anything non-trivial.
- Server-side validation errors (from the API) are surfaced on the matching fields.

---

## 9. Internationalization (i18n)

- **react-i18next** with three locales: `uz`, `ru`, `en` (JSON files under `shared/i18n/locales`).
- **All UI strings use translation keys from day one** — since three languages are committed, no hard-coded text.
- **Default language: Uzbek (`uz`).** A language switcher in the topbar; the choice is persisted in `localStorage`.
- **Ant Design locale** is synced via `ConfigProvider locale` to match the selected language (`en_US`, `ru_RU`, and `uz_UZ` where available; fallback otherwise).
- Dates/numbers formatted per locale.

---

## 10. Styling & Ant Design conventions

Styling combines Tailwind v4 (utilities/layout) with AntD (components). The full rules — palette single-source, `@apply`/`@reference`, AntD override order, cascade layers — live in `DESIGN_SYSTEM.md` §8. Summary:

- **Layout & spacing → Tailwind utilities** in `className` (`flex`, `gap-4`, `grid`, …).
- **AntD appearance → tokens** in `app/theme.ts` (primary path). Adjust AntD components via `className` Tailwind utilities where handy; avoid hand-editing `.ant-*` selectors.
- Custom repeated patterns → a class built with `@apply` (file starts with `@reference "../index.css";`).
- Lists use AntD `Table` with server-driven pagination/sort/filter (paired with React Query).
- Forms use AntD inputs; consistent `PageHeader` + action buttons layout across CRUD screens.
- A thin `shared/components` wrapper standardizes common patterns (table page, confirm-delete, form page).
- `providers.tsx` wraps the app in `ConfigProvider theme={theme}` and `StyleProvider` with cascade layers so Tailwind utilities can override AntD without `!important`.

---

## 11. Role-based UI

- Menu items and routes declare the roles allowed to see/use them.
- `RequireRole` guards routes; the sidebar hides disallowed items.
- This mirrors the backend authorization matrix exactly, so UI and API agree on permissions — the matrix itself lives in `libs/shared` (`PHASE_0_FOUNDATION.md` §6).

### 11.1 Worker screens are mobile-first

Workers (tikuvchi) use the system **from a phone on the workshop floor**, not a desktop. Therefore:

- The pages the `worker` role sees (Phase 3–4: *My tasks*, *mark progress*) are designed **mobile-first**: single-column, large touch targets (≥ 44px), minimal typing — taps and steppers over text inputs.
- The rest of the dashboard stays desktop-first (data-dense tables), with a responsive baseline so it degrades gracefully on tablets.
- This is a design constraint from Phase 0 (layout must not assume a fixed sidebar for every role), implemented concretely in Phase 3.

---

## 12. Environment & config

`frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

- **Token lifetimes are not frontend settings** — they are backend env (`ACCESS_TOKEN_TTL` ≈ `15m`, `REFRESH_TOKEN_TTL` = `2h` inactivity window).
- `config/env.ts` reads and type-checks `import.meta.env` values in one place.

---

## 13. Phase 0 frontend scope (concrete screens)

1. **Login page** (username + password).
2. **Dashboard shell** — `DashboardLayout` with role-filtered sidebar, topbar (user, language switcher, logout).
3. **Users module (admin only):** list (AntD Table), create/edit (form), deactivate (`is_active`).
4. **Change my password** screen.

Definition of done mirrors `PHASE_0_FOUNDATION.md` §11 from the UI side: log in, see role-appropriate menu, manage users as admin, stay logged in while active (silent refresh), and get logged out after 2h of inactivity.

---

## 14. Conventions

- TypeScript `strict`; ESLint + Prettier.
- Feature-based folders; colocate component, hook, api, types.
- Named exports; PascalCase components; `useX` hooks.
- Keep `shared/` for genuinely cross-feature code only.

---

## 15. Future evolution

- **Storefront (Phase 6):** separate Next.js app (`apps/storefront`) for SEO; shares `libs/shared` and possibly a UI lib with the admin.
- **Shared types:** ✅ resolved — `libs/shared` with Zod schemas is the single source of truth (`BUSINESS_PLAN.md` §9.2).
- **Auth hardening:** move to httpOnly cookie + refresh tokens if/when needed.

---

## 16. Next step

After approval: generate `apps/admin` in the Nx workspace (React + Vite plugin) with this structure and implement the Phase 0 screens (login, dashboard shell, users) against the Phase 0 API — alongside building the Phase 0 backend.
