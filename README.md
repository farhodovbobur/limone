# LIMONÉ — Garment Workshop ERP

Internal ERP + light MES for **LIMONÉ APPAREL**: raw-material inventory, production (BOM/norma), finished goods, wages, and orders — with a customer storefront as the final phase. The **admin panel is the core product**; this is not a classic e-commerce project.

> **Status:** Planning. No implementation until the plans below are approved.
> The repo currently holds a bare NestJS scaffold; it will be restructured into an **Nx monorepo** (`apps/api`, `apps/admin`, `libs/shared`) when implementation starts.

## Documents

| Document | What it is |
|----------|------------|
| [BUSINESS_PLAN.md](BUSINESS_PLAN.md) | The root plan: concept, design decisions, phased roadmap, data model, repo structure, open questions |
| [docs/PHASE_0_FOUNDATION.md](docs/PHASE_0_FOUNDATION.md) | Phase 0 design (locked): auth, users, roles, sliding sessions |
| [docs/PHASE_1_MATERIAL_WAREHOUSE.md](docs/PHASE_1_MATERIAL_WAREHOUSE.md) | Phase 1 design (draft): units, multi-currency ledger, receipts, issues, stocktake |
| [docs/FRONTEND_ARCHITECTURE.md](docs/FRONTEND_ARCHITECTURE.md) | Admin dashboard architecture (React 19 + Vite + AntD 6 + Tailwind 4) |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Design tokens (olive/cream), typography, AntD/Tailwind integration |
| [docs/DESIGN_PROMPT.md](docs/DESIGN_PROMPT.md) | Prompt for generating UI mockups |

**Language policy:** English documents are canonical; `*_UZ.md` files are Uzbek translations, regenerated after substantial changes.

## Stack (planned)

Nx monorepo (npm) · NestJS 11 · PostgreSQL 18 + TypeORM 1.0 · React 19 + Vite · Ant Design 6 + Tailwind CSS 4 · Zod (single validation source in `libs/shared`) · Node 24 LTS

## Dev environment

```bash
cp .env.example .env        # then replace every change-me (openssl rand -hex 32)
docker compose up -d        # postgres + node (API) + nginx
```

Fully containerized dev stack:

| Service | Image | Where |
|---------|-------|-------|
| **postgres** | `postgres:18-alpine` | `localhost:${DB_PORT:-5432}`; data in the `limone-postgres-data` volume. The Postgres 18 image keeps data under `/var/lib/postgresql` (not the old `.../data`) — the compose file mounts the right path |
| **node** | `node:24-alpine` | Runs `npm install && npm run start:dev` over a bind mount (hot reload) → `http://localhost:3000`. `node_modules` lives in a container-only volume; `DB_HOST`/`DB_PORT` are overridden to `postgres:5432` inside the network |
| **nginx** | `nginx:alpine` | Reverse proxy → `http://localhost:${NGINX_PORT:-8080}`; config in `infrastructure/docker/nginx/conf.d/` |
| **pgadmin** (optional) | `dpage/pgadmin4:latest` | `docker compose --profile tools up -d pgadmin` → `http://localhost:5050` |

- `.env` is git-ignored; `.env.example` is the committed template. JWT variables follow `docs/PHASE_0_FOUNDATION.md` §7.
- The TS incremental cache lives at `dist/tsconfig.build.tsbuildinfo` (set via `tsBuildInfoFile`), so `deleteOutDir` clears it together with `dist/` — a stale root-level cache once caused "compiled but no dist" failures.

## Next step

Approve `docs/PHASE_1_MATERIAL_WAREHOUSE.md`, scaffold the Nx workspace, then build Phase 0 + Phase 1 as the first usable slice (see BUSINESS_PLAN §13).
