# Observability & Tooling Roadmap

> **Status:** Reference plan — nothing here is installed until its phase arrives
> **Last updated:** 2026-07-09
> **Related:** `../BUSINESS_PLAN.md` (§7 engineering standards, §12 open question #2 — deploy target)
> **Note:** This English document is canonical; `OBSERVABILITY_UZ.md` is a translation.

What we add for logging, debugging, queues, and monitoring — and **when**. Choices are forward-compatible: growing from the small setup to the large one extends the stack, never replaces it.

---

## 1. Roadmap (when → what)

| When | What we add | Purpose |
|------|-------------|---------|
| **Phase 0 skeleton** | `nestjs-pino` | Structured JSON logging with request IDs (required by BUSINESS_PLAN §7); JSON is directly consumable by Loki/Elastic/Datadog later |
| **Phase 0 skeleton** | `@nestjs/swagger` | Interactive API docs/testing UI for every endpoint — near-mandatory NestJS practice |
| **Phase 0 skeleton** | `@nestjs/terminus` `/health` endpoint | App-level health check (the application analog of the Docker healthcheck) |
| **Dev convenience** (anytime) | **Dozzle** — compose `tools` profile, like pgAdmin | Live browser view of container logs; zero config |
| **Phase 5** | **Redis + `@nestjs/bullmq` + Bull Board** (`@bull-board/nestjs`) | Background queue for Telegram notifications (retry on bot-API failure); Bull Board = the queue dashboard (Laravel Horizon analog) |
| **After deploy** (open question #2 resolved) | **Sentry** (`@sentry/nestjs`) | Error tracking with request context; self-hosted option exists |
| **After deploy** | **Grafana Loki + Alloy + Grafana** | Log history, search, alerting (see §2) |
| **If/when needed** | OpenTelemetry (+ Jaeger/Tempo) | Distributed tracing — only relevant once there are multiple services |

---

## 2. Grafana Loki (log aggregation — the "what happened yesterday" tool)

**What it is:** Grafana Labs' log aggregation system — "like Prometheus, but for logs". Open source, self-hostable.

**Architecture (3 parts):**

```
container logs → [Alloy agent] → [Loki storage] ← [Grafana UI]
```

**Why Loki (not ELK):** Loki indexes only *labels* (`container=api`, `level=error`), not full text — runs in a few hundred MB of RAM vs Elasticsearch's gigabytes. Right-sized for a small-business VPS. Trade-off: weaker full-text search, which label + text filters cover in practice.

**Pairs with our choices:** `nestjs-pino` emits JSON → LogQL `| json | level="error"` filters on any field. Log-rate alerts (e.g. "errors > 10/min → Telegram") come built in.

**LogQL examples:**

```logql
{container="limone-api"} |= "error"              # grep-style
{container="limone-api"} | json | level="error"  # field filter on pino JSON
rate({container="limone-api"} |= "error" [5m])   # error rate → chart / alert
```

**Staging — Dozzle vs Loki:** they're stages, not rivals.

| | Dozzle (dev) | Loki (production) |
|---|---|---|
| Question | "what's happening *now*" | "what happened *yesterday 14:30*" |
| History | none | weeks/months (configurable) |
| Search / alerts | basic filter / none | LogQL / yes, incl. Telegram |
| Weight | one tiny container | 3 services, ~0.5 GB RAM |

**Growth path:** Loki + Grafana are the L and G of the **LGTM stack** (Loki, Grafana, Tempo, Mimir). If LIMONÉ ever needs traces and metrics at scale, we add Tempo/Mimir — same Grafana UI, nothing replaced. OpenTelemetry instrumentation exports to any backend (Jaeger, Datadog, Dynatrace) — no vendor lock-in.

---

## 3. Laravel → NestJS mapping (recall table)

| Laravel package | Job | NestJS-world equivalent |
|---|---|---|
| **Horizon** | queue/jobs dashboard | BullMQ + **Bull Board** (`@bull-board/nestjs`); hosted alt: Taskforce.sh |
| **Telescope** | request/query/exception introspection | **Sentry** (errors) + **Swagger** (API browser) + NestJS Devtools (module graph); OpenTelemetry for profiling |
| **log-viewer** | browse logs | `nestjs-pino` (structured base) + **Dozzle** (dev) / **Grafana Loki** (prod) |

Philosophy difference: Laravel ships first-party batteries; the Node/Nest world composes standard independent tools. The table above is the standard composition.

---

## 4. Principles

1. **Nothing is installed before its phase** — this file is a reminder, not a backlog to rush.
2. **Forward-compatible choices only:** pino JSON feeds any log backend; Sentry swaps into APM suites; Loki+Grafana grow into LGTM; OTel is the common language.
3. Small ERP needs **Sentry + Loki**; a large system adds the third pillar (**traces**) and org layer (SLOs, on-call) — the stack extends, it does not get replaced.
