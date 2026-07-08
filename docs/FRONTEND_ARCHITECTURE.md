# Frontend Architecture — Admin Dashboard

> **Status:** Design locked, not yet built
> **Last updated:** 2026-07-05
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
| Routing | **React Router (v6)** | Standard SPA routing |
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
  project.json                 # Nx project config
  vite.config.ts
  .env                         # VITE_API_BASE_URL
  src/
    main.tsx
    App.tsx
    app/
      providers.tsx            # QueryClient, AntD ConfigProvider, i18n, Router
      router.tsx               # route definitions
      queryClient.ts
    config/
      env.ts                   # reads import.meta.env (typed)
      constants.ts
    shared/
      api/
        axios.ts               # axios instance + interceptors
        types.ts               # shared API types (ApiError, Paginated<T>...)
      components/              # reusable: PageHeader, DataTable wrapper, ConfirmDialog
      hooks/
      lib/                     # jwt decode, formatters, helpers
      i18n/
        index.ts
        locales/{uz,ru,en}.json
    layouts/
      DashboardLayout.tsx      # sidebar + topbar + content
      AuthLayout.tsx           # login screen layout
    features/
      auth/
        api/authApi.ts         # login, refresh, logout, me, change-password
        store/authStore.ts     # zustand: accessToken + refreshToken + user
        hooks/useAuth.ts
        components/RequireAuth.tsx   # route guard (logged in)
        components/RequireRole.tsx   # route guard (role allowed)
        pages/LoginPage.tsx
      users/                   # Phase 0: staff management (admin only)
        api/usersApi.ts
        hooks/useUsers.ts
        components/{UserTable,UserForm}.tsx
        pages/{UsersListPage,UserFormPage}.tsx
      # later phases: materials/, products/, production/, wages/, orders/...
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

**Model — Variant B (sliding session).** Two tokens: a short-lived **access token** (~15m) sent on every request, and a **refresh token** whose lifetime is the **2h inactivity window**. Active use keeps refreshing the access token (resetting the 2h window) → the user stays logged in indefinitely. Idle for 2h → refresh fails → logout. The lifetimes live on the backend (`ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`); the frontend does not duplicate them.

**Login flow.** `POST /api/auth/login { username, password }` → `{ accessToken, refreshToken, user }`. Store all in `localStorage` and hydrate the `authStore` (Zustand).

**Persistence.** `localStorage` survives tab and browser close — so an active session continues after a reload, and the 2h idle rule still governs logout.

**Axios interceptors.**
- *Request:* attach `Authorization: Bearer <accessToken>`.
- *Response:* on `401` (access expired) → call `POST /api/auth/refresh { refreshToken }`; on success, store the new tokens and **retry the original request**; on failure (refresh expired/revoked → 2h idle reached, or deactivated) → clear auth + redirect to `/login`.

**Single-flight refresh.** Concurrent 401s share one in-flight refresh call and queue their retries, so the token is refreshed once, not N times.

**On app startup.** Read tokens from storage; if present, hydrate the session optimistically — the first `401`/refresh cycle reconciles validity. If no tokens → logged out.

**"Active" = making requests.** Navigating/interacting triggers API calls, which keep the session alive. (Optional enhancement: a proactive timer refreshes the access token shortly before expiry, and/or an idle-timer logs the user out in the UI exactly at 2h for snappier UX.)

**Security note.** localStorage means an XSS could read the tokens. Acceptable for an internal tool; mitigated by React's default escaping, careful dependencies, and CSP. Auth/token logic is centralized (one `authStore` + the Axios interceptor) so we can later move the **refresh token to an httpOnly cookie** in isolation — recommended for the more-exposed storefront in Phase 6.

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
