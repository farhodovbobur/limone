# Kuzatuv (Observability) va Tooling Yo'l Xaritasi

> **Holat:** Ma'lumotnoma-reja — bu yerdagi hech narsa o'z fazasi kelmaguncha o'rnatilmaydi
> **Oxirgi yangilanish:** 2026-07-09
> **Bog'liq:** `../BUSINESS_PLAN.md` (§7 muhandislik standartlari, §12 ochiq savol №2 — deploy nishoni)
> **Eslatma:** Bu tarjima; asl (canonical) hujjat — `OBSERVABILITY.md`.

Logging, debugging, queue va monitoring uchun nimani va **qachon** qo'shamiz. Tanlovlar oldinga mos (forward-compatible): kichik to'plamdan kattasiga o'tish stack'ni **kengaytiradi**, hech qachon almashtirmaydi.

---

## 1. Yo'l xaritasi (qachon → nima)

| Qachon | Nima qo'shamiz | Maqsad |
|--------|----------------|--------|
| **Faza 0 skeleti** | `nestjs-pino` | Request ID'li strukturali JSON log (BUSINESS_PLAN §7 talabi); JSON'ni keyin Loki/Elastic/Datadog to'g'ridan-to'g'ri yeydi |
| **Faza 0 skeleti** | `@nestjs/swagger` | Har endpoint uchun interaktiv API hujjat/sinash UI — Nest'da deyarli majburiy odat |
| **Faza 0 skeleti** | `@nestjs/terminus` `/health` endpoint | Ilova darajasidagi health check (Docker healthcheck'ning ilova analogi) |
| **Dev qulayligi** (istalganda) | **Dozzle** — compose `tools` profilida, pgAdmin kabi | Container loglarini brauzerda jonli ko'rish; nol config |
| **Faza 5** | **Redis + `@nestjs/bullmq` + Bull Board** (`@bull-board/nestjs`) | Telegram bildirishnomalar uchun fon queue (bot API yiqilsa retry); Bull Board = queue dashboard (Laravel Horizon analogi) |
| **Deploy'dan keyin** (ochiq savol №2 hal bo'lgach) | **Sentry** (`@sentry/nestjs`) | Request konteksti bilan xato kuzatuvi; self-hosted varianti bor |
| **Deploy'dan keyin** | **Grafana Loki + Alloy + Grafana** | Log tarixi, qidiruv, alert (§2 ga qarang) |
| **Kerak bo'lsa** | OpenTelemetry (+ Jaeger/Tempo) | Distributed tracing — faqat bir nechta servis paydo bo'lganda dolzarb |

---

## 2. Grafana Loki (log yig'ish — "kecha nima bo'lgan" vositasi)

**Nima o'zi:** Grafana Labs'ning log yig'ish tizimi — "Prometheus, lekin loglar uchun". Ochiq kodli, self-hosted.

**Arxitektura (3 qism):**

```
container loglari → [Alloy agent] → [Loki saqlash] ← [Grafana UI]
```

**Nega Loki (ELK emas):** Loki faqat *label'larni* indekslaydi (`container=api`, `level=error`), to'liq matnni emas — bir necha yuz MB RAM bilan ishlaydi, Elasticsearch'ga esa gigabaytlar kerak. Kichik biznes VPS'iga mos o'lcham. Kelishuv: full-text qidiruv kuchsizroq, lekin amaliyotda label + matn filtri yetadi.

**Bizning tanlovlar bilan juftligi:** `nestjs-pino` JSON chiqaradi → LogQL `| json | level="error"` har maydon bo'yicha filtrlaydi. Log-tezlik alert'lari (masalan "xato > 10/daqiqa → Telegram") ichida bor.

**LogQL misollar:**

```logql
{container="limone-api"} |= "error"              # grep uslubi
{container="limone-api"} | json | level="error"  # pino JSON maydon filtri
rate({container="limone-api"} |= "error" [5m])   # xato tezligi → grafik / alert
```

**Bosqichlar — Dozzle vs Loki:** ular raqib emas, bosqich.

| | Dozzle (dev) | Loki (production) |
|---|---|---|
| Savoli | "*hozir* nima bo'lyapti" | "*kecha 14:30 da* nima bo'lgan" |
| Tarix | yo'q | haftalar/oylar (sozlanadi) |
| Qidiruv / alert | oddiy filtr / yo'q | LogQL / bor, Telegram'ga ham |
| Og'irligi | bitta mitti container | 3 servis, ~0,5 GB RAM |

**O'sish yo'li:** Loki + Grafana — **LGTM stack**'ning L va G harflari (Loki, Grafana, Tempo, Mimir). LIMONÉ'ga qachondir trace va metrika kerak bo'lsa, Tempo/Mimir qo'shiladi — UI o'sha Grafana, hech narsa almashtirilmaydi. OpenTelemetry instrumentatsiyasi istalgan backend'ga eksport qiladi (Jaeger, Datadog, Dynatrace) — vendor lock-in yo'q.

---

## 3. Laravel → NestJS xaritasi (eslash jadvali)

| Laravel paketi | Vazifasi | NestJS dunyosidagi muqobil |
|---|---|---|
| **Horizon** | queue/job dashboard | BullMQ + **Bull Board** (`@bull-board/nestjs`); hosted muqobil: Taskforce.sh |
| **Telescope** | request/query/exception introspeksiya | **Sentry** (xatolar) + **Swagger** (API ko'rish) + NestJS Devtools (modul grafi); profiling uchun OpenTelemetry |
| **log-viewer** | loglarni ko'rish | `nestjs-pino` (strukturali poydevor) + **Dozzle** (dev) / **Grafana Loki** (prod) |

Falsafa farqi: Laravel birinchi tarafdan "batareyalar" beradi; Node/Nest dunyosi standart mustaqil tool'larni yig'adi. Yuqoridagi jadval — o'sha standart yig'ma.

---

## 4. Printsiplar

1. **Hech narsa o'z fazasidan oldin o'rnatilmaydi** — bu fayl eslatma, shoshilinch backlog emas.
2. **Faqat oldinga mos tanlovlar:** pino JSON istalgan log backend'ga tushadi; Sentry APM to'plamlariga almashadi; Loki+Grafana LGTM bo'lib o'sadi; OTel — umumiy til.
3. Kichik ERP'ga **Sentry + Loki** yetadi; katta tizim uchinchi ustunni (**traces**) va tashkiliy qatlamni (SLO, on-call) qo'shadi — stack kengayadi, almashtirilmaydi.
