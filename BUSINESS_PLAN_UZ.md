# Biznes va Mahsulot Rejasi — LIMONÉ Tikuvchilik Sexi ERP

> **Holat:** Rejalashtirish (biznes hali ochilmagan; rejalar tasdiqlanmaguncha kod yozilmaydi)
> **Oxirgi yangilanish:** 2026-07-05
> **Stack:** Nx monorepo (npm) · Backend — NestJS 11 · Frontend — React 19 (Vite) · DB — PostgreSQL 18 + TypeORM 1.0 · Node 24 LTS
> **Til siyosati:** Asl (canonical) hujjat — inglizcha `BUSINESS_PLAN.md`; bu fayl — tarjima, har katta o'zgarishdan keyin qayta yangilanadi.
> **Eslatma:** Bu tarjima; asl (canonical) hujjat — `BUSINESS_PLAN.md`.

---

## 1. Bu tizim nima (va nima emas)

Bu klassik e-commerce platforma **emas**. Bu — kiyim-kechak biznesi uchun **ERP + yengil MES (ishlab chiqarishni boshqarish tizimi)**. Biznes ikki ish qiladi:

1. **Tayyor kiyimlarni sotadi** (ombor uchun ishlab chiqarib sotish — make-to-stock).
2. **Kiyim tikib sotadi** (buyurtmaga ko'ra — make-to-order), o'zining **sexida**.

**Asosiy mahsulot — admin panel.** Mijoz uchun onlayn do'kon (e-commerce) — **ikkinchi darajali, ulanadigan kanal**: eng oxirida quriladi, lekin data model uni birinchi kundan ko'tarishga tayyor bo'lishi kerak.

Buni to'g'ri nomlash muhim: ustuvorlik — ichki operatsiyalar (ombor, ishlab chiqarish, buyurtma), mijozga qaragan do'kon emas.

---

## 2. Asosiy oqim (tizimning o'qi)

Hamma narsa bitta zanjirga osilgan:

```
Material xaridi (KIRIM) → Material ombor → Sexga sarflash → Ishlab chiqarish
   → Tayyor kiyim → Kiyim ombor → Sotuv / Buyurtma (CHIQIM)
```

Ikki xil buyurtma — bir **xil** zanjirning ikki tetigi:

- **Tayyor kiyim buyurtmasi** → ombordagi tayyor kiyimdan beriladi (make-to-stock).
- **Individual buyurtma** → **srok** bilan ishlab chiqarish vazifasi yaratadi va sexga yuboradi (make-to-order).

---

## 3. Markaziy tushuncha: Norma (BOM)

Eng muhim element — **Norma (Bill of Materials)** — har bir kiyim modeli uchun retsept: qancha mato, nechta tugma, qancha ip va h.k.

Busiz "sex material ishlatadi" — taxminga aylanadi va ombor bir necha haftada chalkashadi. Norma bilan esa:

- Ishlab chiqarish tugagach material **avtomat rasxod** bo'ladi.
- Har bir kiyimning **haqiqiy tannarxi** chiqadi (material + ish haqi) → to'g'ri narx qo'yish va foyda marjasi.

**Butun tizimning qiymati normani to'g'ri modellashtirishga bog'liq.**

---

## 4. Asosiy dizayn qarorlari

Bular ataylab tanlangan va data modelni belgilaydi. 4.7–4.11 qarorlar 2026-iyul rejani ko'rib chiqishda qabul qilindi.

**4.1 Material sarfi — norma + haqiqiy.**
Sarfni norma bo'yicha modellaymiz (retsept asosida, avtomat rasxod), **lekin haqiqiy sarfni ham yozamiz**. Reja va fakt orasidagi farq isrof/kamomadni ko'rsatadi — sexlarda real muammo.

**4.2 Ish haqi — avval kiyimga tekis, keyin operatsiya bo'yicha.**
Tikuv sexlari deyarli har doim **operatsiya bo'yicha sdelniy** ishlaydi (bichuvchi, tikuvchi, dazmolchi har biri har bir donaga). To'liq routing murakkab, shuning uchun MVP kiyimga tekis stavkadan boshlanadi va model keyin operatsiya bo'yicha kengaytirishga tayyor bo'ladi (qayta yozmasdan).

**4.3 Variantlar majburiy — model + o'lcham + rang = SKU.**
Marketplace bo'lmasa ham, kiyim ombori o'lcham/rangsiz ma'nosiz. Tayyor kiyim SKU darajasida, xom-ashyo esa o'lchov birligi bo'yicha (metr, kg, dona, rulon) hisoblanadi.

**4.4 Pul — bitta maydon emas, daftar (ledger) sifatida yuritiladi.**
Buyurtmadagi mijoz to'lovlari — **`Payment` daftari** (bir necha bo'lib to'lash, hatto har xil valyutada) — bitta `advancePaid` raqami emas. Bu mijoz qarzdorligi hisobotini bepul beradi. Yetkazib beruvchiga qarz (nasiya xarid) **keyinga qoldirildi** (§12 Ochiq savollar), lekin har xarid hujjati birinchi kundan `totalAmount` va `paidAmount` ni alohida saqlaydi — kreditorka keyin migratsiyasiz qo'shiladi. To'liq buxgalteriya/kassa keyin bo'lishi mumkin.

**4.5 Kanal-agnostik Buyurtma modeli.**
Buyurtma admin paneldan kiritildimi yoki mijoz onlayn berdimi — ichida bir xil. Onlayn kanal — bu *manba*, alohida model emas. Bu e-commerce qo'shilganda buyurtmani qayta yozishdan saqlaydi.

**4.6 Barcha ombor uchun "ledger" (harakatlar daftari) usuli.**
Har bir ombor o'zgarishi (material yoki tayyor kiyim) — o'zgarmas tranzaksiya (KIRIM/CHIQIM/**ADJUSTMENT**, miqdor, tannarx, manba, vaqt). Joriy qoldiq daftardan hisoblanadi/keshlanadi. Bu **statistika, audit izi va tannarx tarixini bepul beradi** — shu sababli statistika alohida faza emas. `ADJUSTMENT` yozuvlari **inventarizatsiyadan** keladi: sanoq vs tizim miqdori, farq sabab bilan daftarга yoziladi.

**4.7 To'liq multi-currency, muhrlangan qo'sh qiymatlar bilan.**
Material ko'pincha USD'da olinadi, sotuv va ish haqi — so'mda. Tizimdagi har bir pul qiymati bitta **Money pattern** dan foydalanadi va tranzaksiya paytida muhrlanadi:

```
{ currency (UZS|USD), amount, rateUzsPerUsd (o'sha kungi kurs),
  uzsValue, usdValue }   ← ikkala ekvivalent yozuv paytida muhrlanadi
```

- Hisobot va panellarni **UZS yoki USD switcher** bilan ko'rish mumkin; switcher faqat qaysi muhrlangan ustunni yig'ishni tanlaydi.
- **Retro-revalyatsiya yo'q** — kurs o'zgarsa, tarixiy yozuvlar hech qachon o'zgarmaydi.
- Kurslar: admin qo'lda kiritadi va/yoki **CBU (O'zbekiston Markaziy banki) API**sidan olinadi; `ExchangeRate` jadvalida saqlanadi (har sanaga bitta kurs).

**4.8 Tannarx metodi — o'rtacha tortilgan (weighted average).**
Material ombordan chiqqanda (sexga berilganda) uning birlik narxi — hozir ombordagi zaxiraning **o'rtacha tortilgan** narxi, har KIRIMdan keyin qayta hisoblanadi. O'rtacha muhrlangan qiymatlardan **UZS va USD'da parallel** yuritiladi (4.7 ning oqibati). FIFO/partiya tracking hozircha aniq qamrovdan tashqarida.

**4.9 O'lchov birliklari — o'lchamlar (dimension) + material darajasidagi konversiya.**
- Har birlik bir **o'lchamga** tegishli: uzunlik (m, sm), massa (kg, g), dona (dona, juft), yuza (m²).
- **Bir o'lcham ichida** konversiya global va qat'iy (kg↔g, m↔sm).
- **O'lchamlar orasida** (masalan, trikotaj uchun kg→metr) konversiya **material darajasidagi koeffitsiyent** bilan (masalan, *shu* mato: 1 kg = 3,2 m — matoning zichligi/eniga bog'liq, shuning uchun global bo'lolmaydi).
- Har materialning bitta **kanonik birligi** bor; daftar miqdorlarni doim shunda saqlaydi. Asl kiritilgan miqdor + birlik audit uchun saqlanadi.

**4.10 Ishlab chiqarish natijasida sifat darajalari bor.**
Ishlab chiqarish topshirig'i yakunlanganda chiqqan son ikkiga bo'linadi: **A daraja (yaroqli)** va **B daraja (nuqsonli / brak)**. Ikkalasi ham tayyor kiyim omboriga kiradi, brak o'z sifat belgisi bilan — uni chegirmali sotish, qayta ishlash yoki hisobdan chiqarish mumkin. Brak tannarxi statistikada **sifat yo'qotishi** sifatida ko'rinadi. Nuqsonlar hech qachon jimgina e'tibordan chetda qolmaydi: ular real material yutgan.

**4.11 Vaqt siyosati — UTC'da saqlash, biznes vaqtida ko'rsatish.**
Barcha vaqt belgilari `timestamptz` sifatida saqlanadi (UTC — yagona mutlaq haqiqat; integratsiyalar, loglar, JWT muddatlari shunga tekislanadi). UI esa **har foydalanuvchiga, qayerda bo'lishidan qat'i nazar, biznes vaqtini (`Asia/Tashkent`) ko'rsatadi** — chet eldan qaragan rahbar ham sex hisobot bergan o'sha 14:00 ni ko'radi (bir shaharlik ERP siyosati, tomoshabin-zonasi emas). Barcha kunlik/davriy agregatsiyalar **biznes-zona kuni** bo'yicha guruhlaydi: `date(ts AT TIME ZONE 'Asia/Tashkent')` — aks holda kechki (Toshkent 19:00 dan keyingi) operatsiyalar keyingi UTC kunga oqib o'tadi. Zona bitta config qiymatida yashaydi (`APP_TIMEZONE`).

---

## 5. Foydalanuvchi rollari

| Rol | Vazifasi |
|-----|----------|
| Admin / Ega | To'liq kirish, sozlash, hisobotlar |
| Omborchi | Material va tayyor kiyim KIRIM/CHIQIM, inventarizatsiya |
| Sex boshlig'i | Ishlab chiqarish, vazifa biriktirish, status |
| Ishchi (tikuvchi) | O'ziga berilgan vazifalarni ko'radi, holatni belgilaydi — **telefonda** (§9, worker UX) |
| Sotuvchi | Buyurtma yaratish/tasdiqlash, mijozlar |

---

## 6. Fazalar (pastdan-yuqoriga; har bir faza alohida ishlatsa bo'ladi)

### Faza 0 — Poydevor
Auth, rollar (admin, omborchi, sex boshlig'i, ishchi, sotuvchi), ilova skeleti, umumiy UI skeleti. Batafsil dizayn: `docs/PHASE_0_FOUNDATION.md`.
*Natija:* login + rol bo'yicha kirish; hali "ishlatadigan" narsa yo'q, lekin hammasi shunga tayanadi.

### Faza 1 — Material ombori
O'lchov birliklari, valyuta kurslari, xom-ashyo katalogi, yetkazib beruvchilar, material **KIRIM** (xarid hujjatlari: narx, valyuta, jami/to'langan) va **CHIQIM**, joriy qoldiq, o'rtacha tortilgan tannarx, kam qoldiq ogohlantirishi, **inventarizatsiya → ADJUSTMENT**. Batafsil dizayn: `docs/PHASE_1_MATERIAL_WAREHOUSE.md`.
*Natija:* omborchi darhol foydalana boshlaydi.

### Faza 2 — Katalog + Tayyor kiyim ombori
Kiyim modellari, variantlar (o'lcham/rang = SKU), tayyor kiyim **KIRIM/CHIQIM/qoldiq** — **sifat darajalari (A/brak)** bilan, tayyor kiyim inventarizatsiyasi. Tayyor kiyim ishlab chiqarishdan (Faza 3) yoki to'g'ridan xariddan kirishi mumkin.
*Natija:* to'liq kiyim ombori nazorati; sotuvga poydevor.

### Faza 3 — Norma (BOM) + Ishlab chiqarish
Model bo'yicha norma, ishlab chiqarish topshiriqlari (work order), sexga vazifa biriktirish, status pipeline (yangi → bichish → tikish → tayyor → qabul qilindi), norma bo'yicha material rasxodi (reja vs fakt), yakunda **A / brak** ga bo'lish → kiyim omboriga kirim.
*Natija:* tizimning yuragi — ishlab chiqarish nazorati va aniq material sarfi.

### Faza 4 — Ish haqi
Ish haqi stavkalari, tugagan ishlab chiqarishdan avtomat hisob (avval kiyimga tekis; keyin operatsiya bo'yicha), har bir ishchi uchun davr bo'yicha hisob-kitob.
*Natija:* mehnat xarajati ko'rinishi + ishchiga to'lov.

### Faza 5 — Sotuv / Buyurtma (2 tur) + Bildirishnomalar
Tayyor kiyim buyurtmalari (ombordan) va individual buyurtmalar (→ sexga vazifa + srok), tasdiqlash oqimi, **`Payment` daftari** (bo'lib to'lash, mijoz qarzdorligi), bildirishnomalar **Telegram bot + panel ichida** (yangi buyurtma → admin/sotuvchi; kam qoldiq → omborchi). Mijozlar va (individual uchun) o'lchovlar. *Shu faza dizaynida hal qilinadigan ochiq savol: tezkor sotuv (POS) oqimi — §12.*
*Natija:* asl sotuv biznes oqimi.

### Faza 6 — E-commerce do'koni
Mijoz uchun do'kon (alohida ilova, ehtimol Next.js): katalogni ko'rish, savat, buyurtma berish. Onlayn buyurtma `kanal = ONLINE` sifatida Faza 5 buyurtma oqimiga tushadi → bildirishnoma → admin tasdiqlaydi (admin buyurtmalari bilan bir xil yo'l).
*Natija:* onlayn sotuv kanali.

> **Statistika — faza emas.** U byprodukt: har bir modul daftar va buyurtmalar ustidan query sifatida qurilgan kichik panellar bilan keladi — UZS yoki USD'da (switcher, §4.7).

---

## 7. Muhandislik standartlari (ko'ndalang — faza emas)

Sifat uzluksiz; har faza bularni **bilan birga** topshiradi, ulardan keyin emas:

- **Testlar o'z fazasi bilan chiqadi.** Har faza natijasi domen mantig'i uchun unit testlar (tannarx, konversiya, token rotatsiyasi) va endpointlari uchun e2e testlarni o'z ichiga oladi. Oxirida "test fazasi" yo'q.
- **CI birinchi kundan:** har push'da lint + typecheck + test + build (Nx'ning affected-only ishga tushirishidan foydalanib).
- **Docker Compose birinchi kundan** dev muhit uchun (PostgreSQL); birinchi deploy'dan oldin production image.
- **Birinchi real ma'lumotdan oldin avtomatik DB backup.** Faza 1 omborchi uchun faqat rejali backup (masalan, tungi `pg_dump` + tashqi nusxa) mavjud bo'lgach ishga tushadi. Biznes daftari disk o'limidan omon qolishi shart.
- **Deploy nishoni Faza 1 oxirigacha hal qilinadi** (§12 Ochiq savollar), logging va xato-hisobot asoslari bilan birga.
- **Strukturali xato formati + logging** — Faza 0 skeletining qismi.

---

## 8. Data model umumiy ko'rinishi (fazalar bo'yicha)

Quyidagi pul tipidagi maydonlar §4.7 dagi **Money pattern**dan foydalanadi (valyuta, summa, kurs, muhrlangan UZS+USD qiymatlar).

**Faza 0:** `User`, `Role` (seed qilingan jadval + `RoleCode` enum gibridi — PHASE_0 §5 ga qarang), `RefreshToken`

**Faza 1:** `Unit` (kod, nom, dimension, factorToDimensionBase), `ExchangeRate` (sana, rateUzsPerUsd, manba), `Material` (kanonik birlik, material darajasidagi o'lchamlararo koeffitsiyentlar, minStock, keshlangan o'rtacha tannarx UZS/USD), `Supplier`, `MaterialReceipt` + `MaterialReceiptItem` (xarid hujjati: yetkazib beruvchi, valyuta, totalAmount, paidAmount), `MaterialTransaction` (KIRIM/CHIQIM/ADJUSTMENT daftari: material, kanonik birlikdagi miqdor, asl miqdor+birlik, Money ko'rinishidagi birlik narx, refType, refId, sana), `Stocktake` + `StocktakeLine`

**Faza 2:** `ProductModel`, `ProductVariant` (o'lcham, rang, sku, sellPrice — Money), `FinishedGoodsTransaction` (variant, turi, **daraja A|B**, miqdor, unitCost — Money, ref, sana)

**Faza 3:** `Bom` / `Norma` + `BomItem` (material, materialning kanonik birligida birlikka miqdor), `ProductionOrder` (model/variant, miqdor, mas'ul, srok, status, sourceOrderId?), `ProductionMaterialUsage` (rejaMiqdor, faktMiqdor), yakun natijasi (qtyGradeA, qtyGradeB)

**Faza 4:** `Operation` (ixtiyoriy routing), `WageRate`, `ProductionTask` (operatsiya, ishchi, bajarilgan, summa), `WageRecord` (ishchi, davr, jami, to'langan)

**Faza 5:** `Customer`, `CustomerMeasurement`, `Order` (turi: READY_MADE | CUSTOM, kanal: ADMIN | ONLINE, status, jami — Money, srok?), `OrderItem`, **`Payment`** (buyurtma, sana, Money, usul), `Notification`

**Faza 6:** mijoz auth + do'kon (Faza 5 `Order` ni qayta ishlatadi)

### Buyurtma hayot tsikli

```
NEW (tasdiq kutilmoqda)
  → CONFIRMED (tasdiqlandi)
      → READY_MADE:  kiyim ombor CHIQIM → FULFILLED / SHIPPED
      → CUSTOM:      ProductionOrder yaratiladi (srok bilan)
                       → IN_PRODUCTION → READY → DELIVERED
  → CANCELLED (bekor)
```

---

## 9. Repo tuzilishi va texnologiya

### 9.1 Monorepo — Nx (integrated) + npm

Bitta **Nx integrated workspace**, package manager — npm, Nx'ning `apps/` + `libs/` konventsiyasi bo'yicha:

```
limone/
├── nx.json / package.json        # Nx workspace, npm
├── apps/
│   ├── api/                      # NestJS backend
│   ├── admin/                    # Vite + React admin panel
│   └── storefront/               # Faza 6 (ehtimol Next.js)
├── libs/
│   └── shared/                   # api va admin bo'lishadigan yagona haqiqat manbai:
│                                 #   Zod sxemalar (validatsiya), Role enum,
│                                 #   statuslar, avtorizatsiya matritsasi, API type'lar
├── docs/
└── BUSINESS_PLAN.md
```

- Nx task graph + kesh, `affected`-only CI, generatorlar va **majburiy modul chegaralari** beradi (lint qoidasi: app'lar `libs/shared`ga tayanadi, bir-biriga hech qachon).
- Dependency'lar har doim ishlatilgan joyida e'lon qilinadi (phantom dependency'dan himoya, chunki npm hoisting qiladi).

### 9.2 API kontrakt — yagona manba Zod

Validatsiya sxemalari **bir marta**, Zod'da, `libs/shared` ichida yoziladi:

- **Backend:** `nestjs-zod` shu sxemalarni validatsiya pipe sifatida ishlatadi (class-validator o'rnini bosadi). Sxemalar strict — noma'lum maydonlar rad etiladi.
- **Frontend:** React Hook Form + `@hookform/resolvers/zod` orqali **aynan o'sha** sxemalar.
- Enum'lar (rollar, buyurtma/ishlab chiqarish statuslari, tranzaksiya turlari, valyutalar, o'lchamlar) `libs/shared`da yashaydi va ikkala tomon import qiladi.

Bitta qoida ("username ≥ 3 belgi") aynan bitta joyda mavjud; FE/BE drift konstruktsiya bo'yicha imkonsiz.

### 9.3 Versiya siyosati

**Nx plugin ekotizimi qo'llab-quvvatlagan eng so'nggi barqaror versiyalar.** Nx yangilanishlarni o'z release-train'iga bog'laydi (`nx migrate`); framework major'i (masalan, NestJS 12) chiqsa, tegishli Nx plugini yangilanganда ko'tarilamiz. Har paketni qo'shishdan oldin npm registry'dan joriy versiyani tekshir va peer-dependency mosligini ko'r. Quyidagilar — 2026-iyul holatidagi asos (baseline).

| Qatlam | Tanlov | Versiya (2026-iyul) |
|--------|--------|---------------------|
| Monorepo | Nx (integrated) + npm | eng so'nggi Nx |
| Runtime | Node.js | 24 LTS (TypeORM 1.0 ≥ 20.19 talab qiladi) |
| Backend framework | NestJS | 11.x |
| Til | TypeScript | 5.9.x (TS 6 chiqqan, lekin typescript-eslint `<6.1.0` talab qiladi; lint ekotizimi qo'llaganda ko'tariladi) |
| ORM | TypeORM | 1.0.x |
| Ma'lumotlar bazasi | PostgreSQL | 18.x |
| Drayver | `pg` | 8.21.x |
| Auth | `@nestjs/jwt` 11, Passport, bcrypt 6 | — |
| Validatsiya | **Zod + nestjs-zod** (sxemalar `libs/shared`da) | — |
| Lint/test | ESLint 9, typescript-eslint 8.x, Jest 30 | — |
| Frontend | Vite 8 · React 19 · Ant Design 6 · Tailwind CSS 4 | — |

- **Frontend:** React 19 + Vite admin panel (`apps/admin`); mijoz do'koni Faza 6 da. `docs/FRONTEND_ARCHITECTURE.md` ga qarang. Ishchi (worker) ko'radigan ekranlar **mobil-first** (ishchilar sexda telefondan foydalanadi).
- **Joriy holat (halol):** bu repoda hozircha faqat ildizdagi toza `nest new` skeleti va shu reja hujjatlari bor. **Auth ham, TypeORM ham, domen kodi ham hali yo'q.** (Oldingi tahrirlarda tilga olingan e-commerce skeleti bu repodan tashqarida va **ko'chirilmaydi** — Faza 0 uning dizaynini butunlay almashtiradi.) Implementatsiya boshlanganда skelet yuqoridagi Nx workspace'ga qayta tuziladi.

---

## 10. Risklar va yechimlar

| Risk | Yechim |
|------|--------|
| Norma noaniqligi (isrof/kamomad) | Reja vs faktni yozish; davriy inventarizatsiya → ADJUSTMENT daftari yozuvlari |
| Ish haqi modeli murakkabligi | Avval kiyimga tekis; keyin operatsiya bo'yicha qilishga tayyor |
| Scope creep (qamrov kengayishi) | Qat'iy faza tartibi; har faza ishlatsa bo'ladigan holda chiqadi |
| Ombor og'ishi (drift) | O'zgarmas daftar + inventarizatsiya bilan solishtirish |
| **Multi-currency murakkabligi** | Muhrlangan qo'sh qiymatli Money pattern (§4.7); retro-revalyatsiya yo'q; kurslar tranzaksiya bo'yicha muhrlanadi |
| **Birlik konversiyasi xatolari** | Har materialga kanonik birlik; o'lchamlararo koeffitsiyentlar material darajasida va kiritish paytida ko'rsatiladi; asl kiritilgan qiymat saqlanadi |
| **Nx yangilanish bog'liqligi** | §9.3 versiya siyosati: Nx release-train'iga ergashish; pre-release framework major'lardan qochish |
| Kech integratsiya sinovi (bottom-up riski) | Modullararo kontraktlar birinchi kundan `libs/shared`da; testlar har faza bilan chiqadi (§7) |

---

## 11. Lug'at

- **Norma / BOM** — har bir kiyim modeli uchun material retsepti.
- **Prixod / KIRIM** — omborga kirish (xarid yoki ishlab chiqarish natijasi).
- **Rasxod / CHIQIM** — ombordan chiqish (sarf yoki sotuv).
- **ADJUSTMENT** — inventarizatsiyadan kelgan daftar tuzatishi.
- **SKU** — noyob ombor birligi = model + o'lcham + rang.
- **A daraja / B daraja (brak)** — yaroqli va nuqsonli ishlab chiqarish natijasi.
- **Money pattern** — tranzaksiya paytida muhrlangan `{valyuta, summa, kurs, UZS va USD qiymatlar}` (§4.7).
- **Kanonik birlik** — material zaxirasi yuritiladigan yagona birlik.
- **Make-to-stock** — ombor uchun oldindan ishlab chiqarish.
- **Make-to-order** — individual buyurtmaga ko'ra ishlab chiqarish.
- **Sdelniy (donabay)** — bajarilgan dona/operatsiyaga to'lov.
- **Sex** — ishlab chiqarish sexi.

---

## 12. Ochiq savollar (ataylab hal qilinmagan)

| # | Savol | Qachon hal qilinadi |
|---|-------|---------------------|
| 1 | **Tezkor sotuv (POS) oqimi** — bir qadamda "hozir sotish" kerak bo'lgan jismoniy do'kon bormi (buyurtma to'g'ridan-to'g'ri FULFILLED, kanal SHOP)? | Faza 5 batafsil dizayni |
| 2 | **Deploy nishoni** — VPS yoki cloud, hosting joyi, TLS, domen | Faza 1 oxiri (birinchi real ma'lumotdan oldin) |
| 3 | **Yetkazib beruvchiga qarz (kreditorka)** — nasiya xarid daftari; xarid hujjatidagi totalAmount/paidAmount orqali eshik ochiq (§4.4) | Faza 5+ yoki hech qachon |
| 4 | **TypeScript 6 ga o'tish** — typescript-eslint qo'llab-quvvatlashiga bog'liq | Lint ekotizimi ruxsat berganda |
| 5 | **Rol-yaratish UI + permissions modeli** — roles jadvali seed bilan keladi (tizim rollari qat'iy); UI'dan rol yaratish avval bazada saqlanadigan ruxsatlarni talab qiladi (PHASE_0 §13) | Dinamik rollar chindan so'ralganda |
| 6 | **Nx'ni qachon kiritish** — egasining qarori (2026-07-25): avval poydevorni o'rganish, shuning uchun `apps/admin` mustaqil Vite loyihasi (o'z package.json'i bilan), API esa repo root'ida qoladi; Nx + `apps/api` ko'chirish + `libs/shared` keyinroq. Ungacha Zod sxemalar FE tomonda nusxalanadi (drift xavfi qabul qilingan, kichik saqlanadi) | Umumiy-kontrakt og'rig'i yoki ikkinchi iste'molchi ilova paydo bo'lganda |

---

## 13. Keyingi qadam

1. `docs/PHASE_1_MATERIAL_WAREHOUSE.md` ni ko'rib chiqish va tasdiqlash (shu tahrir bilan birga tayyorlangan).
2. ~~Nx workspace'ni yaratish~~ **Kechiktirildi** (§12 #6): `apps/admin` mustaqil ishlaydi; Nx + `libs/shared` keyinroq.
3. **Faza 0 + Faza 1 ni birga** birinchi ishlatsa bo'ladigan bo'lak sifatida, §7 muhandislik standartlari bilan amalga oshirish.
