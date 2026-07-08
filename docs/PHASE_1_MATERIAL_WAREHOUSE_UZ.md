# Faza 1 — Material Ombori

> **Holat:** Qoralama — ko'rib chiqish uchun
> **Oxirgi yangilanish:** 2026-07-05
> **Stack:** Nx monorepo (`apps/api`) · NestJS 11 · PostgreSQL 18 · TypeORM 1.0 · Zod (`nestjs-zod`, sxemalar `libs/shared`da)
> **Bog'liq:** `../BUSINESS_PLAN.md` (§4.6–4.9, §8), `./PHASE_0_FOUNDATION.md` (§6 avtorizatsiya matritsasi)
> **Eslatma:** Bu tarjima; asl (canonical) hujjat — `PHASE_1_MATERIAL_WAREHOUSE.md`.

---

## 1. Maqsad

Birinchi **ishlatsa bo'ladigan** modul: omborchi material xaridlarini (KIRIM) yozadi, sexga material beradi (CHIQIM), jonli qoldiq va uning qiymatini ko'radi, kam qoldiq ogohlantirishini oladi, va inventarizatsiya orqali haqiqatni daftar bilan solishtiradi (ADJUSTMENT). Keyingi har bir faza (norma, ishlab chiqarish, tannarx) shu faza yaratadigan daftardan o'qiydi.

---

## 2. Qamrov

**Qamrovda**
- O'lchov birliklari (o'lchamlar/dimension, global + material darajasidagi konversiya)
- Valyuta kurslari (qo'lda + CBU API) va **Money pattern** (muhrlangan qo'sh UZS/USD qiymatlar)
- Material katalogi (+ yengil material kategoriyalari) va yetkazib beruvchilar
- Xarid hujjatlari (**KIRIM**) — ko'p qatorli, valyuta, `totalAmount`, `paidAmount` bilan
- Material berish (**CHIQIM**) — o'rtacha tortilgan tannarx bilan
- O'zgarmas `MaterialTransaction` daftari; joriy qoldiq va qiymat undan hisoblanadi
- Inventarizatsiya → **ADJUSTMENT** daftar yozuvlari
- Kam qoldiq ogohlantirishi (shu fazadan panel ichida; Telegram yetkazish Faza 5 bilan keladi)
- Kichik panel: ombor qiymati (UZS/USD switcher), so'nggi harakatlar, kam qoldiq ro'yxati

**Qamrovdan tashqari (non-goals)**
- Tayyor kiyim (→ Faza 2), norma/avtomat rasxod (→ Faza 3)
- Yetkazib beruvchiga qarz (kreditorka) — **keyinga qoldirilgan** (`BUSINESS_PLAN.md` §12); hujjatlar baribir `totalAmount` va `paidAmount`ni saqlaydi — keyin migratsiyasiz qo'shiladi
- FIFO / partiya tracking — faqat o'rtacha tortilgan (biznes reja §4.8)
- Shtrix-kod / etiketka chop etish, ko'p ombor, material rasmlari — real foydalanishdan keyin qaytiladi

---

## 3. Bu yerda qo'llangan qarorlar

| # | Qaror | Manba |
|---|-------|-------|
| D1 | To'liq multi-currency; har pul qiymati yozuv paytida `{currency, amount, rate, uzsValue, usdValue}` sifatida muhrlanadi; retro-revalyatsiya yo'q; hisobotlar UZS/USD almashinadigan | Biznes reja §4.7 |
| D2 | Tannarx = **o'rtacha tortilgan**, UZS va USD'da parallel yuritiladi | §4.8 |
| D3 | Birliklarning **o'lchamlari** bor; bir o'lcham ichida global konversiya; o'lchamlararo — **material darajasidagi koeffitsiyent**; daftar doim materialning **kanonik birligida** | §4.9 |
| D4 | Daftar o'zgarmas; tuzatishlar teskari yozuv bilan, tahrir bilan emas | §4.6 |
| D5 | Qoldiq hech qachon manfiy bo'lolmaydi — joriy qoldiqdan katta CHIQIM rad etiladi | shu hujjat |
| D6 | Xarid hujjati darhol o'tkaziladi (MVP'da qoralama holati yo'q) | shu hujjat |

---

## 4. O'lchov birliklari

**O'lchamlar (dimension):** `LENGTH` (asos: metr), `MASS` (asos: kg), `COUNT` (asos: dona), `AREA` (asos: m²).

**`units` jadvali** — seed qilinadi, admin kengaytira oladi: `code` (unique: `m`, `cm`, `kg`, `g`, `pc`, `pair`, `roll`, `bobbin`, `m2`…), `name`, `dimension`, `factor_to_base` (masalan `cm` → 0.01; `roll`/`bobbin` — COUNT o'lchamidagi birliklar, factor 1).

**Konversiya algoritmi** — `M` material (kanonik birligi `C`) uchun `U` birlikda `q` miqdor kiritilganda:

1. `U = C` → `q` o'z holicha saqlanadi.
2. `U.dimension = C.dimension` → `q × U.factor_to_base / C.factor_to_base` (global, aniq).
3. O'lchamlar har xil → `material_unit_factors(M, U)` qidiriladi; topilsa `q × factor`; topilmasa kiritish **rad etiladi** va UI foydalanuvchidan avval koeffitsiyentni belgilashni so'raydi (masalan "shu mato uchun: 1 kg = 3,2 m", "1 rulon = 25 m").

Daftar **kanonik miqdorni** hamda audit uchun asl `q`/`U`ni saqlaydi. Material darajasidagi koeffitsiyentlar tahrirlanadigan spravochnik — o'zgarishi faqat *kelgusi* yozuvlarga ta'sir qiladi (D4).

---

## 5. Valyuta va Money pattern

**`exchange_rates`** — har sanaga bitta yozuv: `date` (unique), `rate_uzs_per_usd`, `source` (`MANUAL` | `CBU`). `D` sanasidagi tranzaksiya `date ≤ D` bo'lgan eng so'nggi kursni oladi; topilmasa API aniq xato qaytaradi va UI admindan kurs kiritishni (yoki CBU API'dan olishni) so'raydi.

**Money qiymati** (TypeORM embedded / ustunlar guruhi, Zod sxemasi `libs/shared`da):

| Maydon | Turi | Ma'nosi |
|--------|------|---------|
| `currency` | enum `UZS`\|`USD` | foydalanuvchi kiritgan valyuta |
| `amount` | numeric(18,2) | kiritilgan valyutadagi qiymat |
| `rate_uzs_per_usd` | numeric(14,2) | o'sha kunda qo'llangan kurs |
| `uzs_value` | numeric(18,2) | muhrlangan UZS ekvivalent |
| `usd_value` | numeric(18,4) | muhrlangan USD ekvivalent (4 xona — birlik narxlar kichik bo'lishi mumkin) |

Hisobotlar UI switcher'iga qarab `uzs_value` yoki `usd_value`ni yig'adi — tarixiy yozuvlar hech qachon o'zgarmaydi (D1).

---

## 6. Data model

Miqdorlar: kanonik birlikda `numeric(14,3)`, boshqacha aytilmasa.

**`material_categories`** — yengil guruhlash (mato, furnitura, ip…): `id`, `name`.

**`suppliers`** — `id`, `name`, `phone`, `notes`, `is_active`, timestamps. Hard delete yo'q.

**`materials`**
| Ustun | Izoh |
|-------|------|
| `id`, `name`, `code` (unique, ixtiyoriy), `category_id` FK | |
| `canonical_unit_id` FK → units | zaxira yuritiladigan birlik |
| `min_stock` | kam qoldiq chegarasi, kanonik birlikda |
| `current_stock` | **keshlangan**, = SUM(daftar qty); qayta hisoblanadigan |
| `avg_cost_uzs`, `avg_cost_usd` | **keshlangan** o'rtacha tortilgan (§7) |
| `is_active`, timestamps | deaktivatsiya, hech qachon o'chirilmaydi |

**`material_unit_factors`** — `material_id`, `from_unit_id`, `factor` (1 from-birlik = factor × kanonik birlik), unique (material, from_unit).

**`material_receipts`** (xarid hujjati; o'tkazilganda KIRIM daftar yozuvlarini yaratadi)
`id`, `number` (avto, masalan `RCP-2026-0001`), `supplier_id`, `date`, `currency`, `rate_uzs_per_usd`, `total` (Money, qatorlardan hisoblanadi), `paid_amount` numeric — `total` bilan bir valyutada (kreditorka uchun eshik ochiq), `notes`, `created_by`, timestamps.

**`material_receipt_items`** — `receipt_id`, `material_id`, `qty_entered` + `unit_entered_id`, `qty_canonical`, `unit_price` (Money, kiritilgan birlikka), `line_total` (Money).

**`material_transactions`** — o'zgarmas daftar:
| Ustun | Izoh |
|-------|------|
| `id`, `material_id` | |
| `type` | `IN` \| `OUT` \| `ADJUSTMENT` |
| `qty` | **ishorali**, kanonik birlik: IN > 0, OUT < 0, ADJUSTMENT ikkalasi ham. `current_stock = SUM(qty)` |
| `original_qty`, `original_unit_id` | foydalanuvchi aslida nima kiritgani (audit) |
| `unit_cost` | Money, kanonik birlikka (IN: hujjatdan; OUT/ADJUSTMENT: o'sha paytdagi o'rtacha tortilgan) |
| `ref_type`, `ref_id` | `RECEIPT` \| `ISSUE` \| `STOCKTAKE` (keyin: `PRODUCTION`) |
| `note`, `created_by`, `created_at` | `updated_at` **yo'q** — yozuvlar hech qachon tahrirlanmaydi (D4) |

**`material_issues`** (CHIQIM hujjati) — Faza 1 da hali ishlab chiqarish topshirig'i yo'q, shuning uchun berish shularni yozadi: `id`, `number`, `date`, `purpose` (erkin matn, masalan "sexga — ko'ylak partiyasi"), `issued_to` (erkin matn yoki user), qatorlar (`material_id`, `qty_entered`/`unit`, `qty_canonical`), `created_by`. Faza 3 dan boshlab ishlab chiqarish sarfi buning o'rniga ishlab chiqarish topshirig'iga bog'lanadi.

**`stocktakes`** — `id`, `date`, `status` (`IN_PROGRESS` | `COMPLETED`), `created_by`, `completed_at`; qatorlar: `material_id`, `system_qty` (boshlanishdagi snapshot), `counted_qty`, `difference` (hisoblanadigan). Inventarizatsiyani yakunlash har nolga teng bo'lmagan farq uchun bitta ADJUSTMENT daftar yozuvini (joriy o'rtacha tortilgan bilan baholab) yozadi va hujjatni qulflaydi.

---

## 7. Tannarx qoidalari (o'rtacha tortilgan)

Har material bo'yicha, UZS va USD uchun parallel yuritiladi (muhrlangan Money qiymatlardan):

- **KIRIM (xarid):** `yangi_ortacha = (qoldiq_qty × ortacha + kirim_qty × kirim_birlik_narx) / (qoldiq_qty + kirim_qty)` — `uzs` va `usd` ustunlar uchun mustaqil hisoblanadi. Qoldiq += qty.
- **CHIQIM (berish):** `birlik_narx = joriy o'rtacha` (ikkala valyutada). Qoldiq −= qty. O'rtacha o'zgarmaydi.
- **ADJUSTMENT:** ortiqcha yoki kamomad joriy o'rtacha bilan baholanadi. O'rtacha o'zgarmaydi.
- **Qoldiq 0 ga tushsa:** keyingi KIRIM o'rtachani o'sha hujjatning birlik narxiga o'rnatadi (qoldiq qiymat ko'chirilmaydi).
- **Manfiy qoldiq taqiqlanadi (D5):** qoldiqni 0 dan pastga tushiradigan CHIQIM yoki manfiy ADJUSTMENT xatoda mavjud miqdor ko'rsatilib rad etiladi.
- Keshlangan `current_stock` / `avg_cost_*` har doim daftardan noldan qayta hisoblash bilan teng bo'lishi kerak (drift'dan `rebuild` texnik ishi himoya qiladi).

Bu qoidalar uchun unit testlar shu faza bilan chiqadi (muhandislik standartlari, biznes reja §7).

---

## 8. API endpointlar

Hammasi `/api` ostida. `WK` = omborchi (warehouse_keeper), `WM` = sex boshlig'i (workshop_manager). Faza 0 avtorizatsiya matritsasi bo'yicha: **admin RW, WK RW, WM faqat o'qish; ishchi va sotuvchi — kirish yo'q.** Spravochniklar (birliklar, kurslar, kategoriyalar) — admin yozadi.

| Metod | Yo'l | Kirish | Maqsad |
|-------|------|--------|--------|
| GET/POST/PATCH | `/units` | R: admin+WK+WM · W: admin | O'lchov birliklari |
| GET/POST | `/exchange-rates` | R: auth · W: admin | Kurslar; `POST /exchange-rates/sync-cbu` bugungi CBU kursini oladi |
| GET/POST/PATCH | `/material-categories` | R: admin+WK+WM · W: admin | Yengil guruhlash |
| GET/POST/PATCH | `/suppliers` | R+W: admin+WK | DELETE yo'q — deaktivatsiya |
| GET/POST/PATCH | `/materials` | R: admin+WK+WM · W: admin+WK | Katalog; PATCH `min_stock`, koeffitsiyentlarni o'z ichiga oladi |
| GET/PUT | `/materials/:id/unit-factors` | R: admin+WK+WM · W: admin+WK | Material darajasidagi konversiya koeffitsiyentlari |
| GET | `/materials/:id/transactions` | admin+WK+WM | Daftar tarixi (paginatsiya bilan) |
| GET | `/materials/low-stock` | admin+WK+WM | `current_stock ≤ min_stock` |
| GET/POST | `/material-receipts` | R: admin+WK+WM · W: admin+WK | Yaratish = o'tkazish: KIRIM yozuvlari, o'rtachalar yangilanadi |
| GET/POST | `/material-issues` | R: admin+WK+WM · W: admin+WK | Yaratish = o'tkazish: joriy o'rtacha bilan CHIQIM yozuvlari |
| GET/POST | `/stocktakes` | R: admin+WK+WM · W: admin+WK | Snapshot qatorlar bilan boshlash |
| PATCH | `/stocktakes/:id/lines` | admin+WK | Sanoq miqdorlarini kiritish |
| POST | `/stocktakes/:id/complete` | admin+WK | ADJUSTMENT'lar yoziladi, hujjat qulflanadi |
| GET | `/reports/stock-value` | admin+WK+WM | Jami va material bo'yicha qiymat, UZS/USD |

Har so'rov tanasi uchun validatsiya: `libs/shared`dagi Zod sxemalari — admin UI formalari bilan bo'lishiladi.

---

## 9. Frontend ekranlar (apps/admin)

1. **Materiallar ro'yxati** — jadval: nom, kategoriya, kanonik birlik, joriy qoldiq, min qoldiq, o'rtacha tannarx (UZS/USD switcher), kam qoldiq qatorlari ogohlantirish chipi bilan (status rangi + yorliq, hech qachon faqat rang emas).
2. **Material formasi** — drawer: nom, kod, kategoriya, kanonik birlik, min qoldiq, koeffitsiyentlar muharriri ("1 kg = __ m").
3. **Kirim (xarid) formasi** — yetkazib beruvchi, sana, valyuta (+ kurs ko'rsatiladi, tahrirlanadi), qatorlar (material, miqdor + birlik, birlik narx), jami va to'langan summa; saqlashda o'tkaziladi.
4. **Chiqim (berish) formasi** — maqsad, qatorlar (material, miqdor + birlik); mavjud qoldiq shu yerda ko'rsatiladi.
5. **Material kartasi** — qoldiq, o'rtachalar, daftar tarixi (paginatsiya), koeffitsiyentlar.
6. **Inventarizatsiya oqimi** — boshlash (snapshot) → sanoqni kiritish → farqlarni ko'rish → yakunlash.
7. **Yetkazib beruvchilar, birliklar, kurslar** — oddiy spravochnik CRUD (kurslar: qo'lda kiritish + "CBU'dan olish" tugmasi).
8. **Ombor paneli** — ombor qiymati, kam qoldiq ro'yxati, so'nggi harakatlar.

---

## 10. Qabul mezonlari (Definition of Done)

- [ ] USD'dagi kirim o'sha kungi kurs bilan muhrlangan `uzs_value`/`usd_value` li KIRIM yozuvlarini yozadi; keyinroq kurs o'zgarishi ularni **o'zgartirmaydi**.
- [ ] Kanonik bo'lmagan birlikda kiritilgan xarid (kg-material uchun g; koeffitsiyentli m-mato uchun kg) to'g'ri kanonik miqdorni saqlaydi va asl kiritishni yo'qotmaydi.
- [ ] Koeffitsiyent belgilanmagan o'lchamlararo miqdor kiritish tushunarli xato bilan rad etiladi.
- [ ] Har xil narx/valyutadagi aralash KIRIM ketma-ketligidan keyin o'rtacha tortilgan qo'lda hisoblangan qiymatlarga mos keladi (unit test bilan).
- [ ] Joriy qoldiqdan katta chiqim rad etiladi; qoldiq hech qachon manfiy bo'lmaydi.
- [ ] Inventarizatsiyani yakunlash sanoq − tizim farqiga teng, joriy o'rtacha bilan baholangan ADJUSTMENT'larni yozadi va hujjatni qulflaydi.
- [ ] `current_stock` va `avg_cost_*` har doim daftardan noldan qayta hisoblashga teng (rebuild ishi testlarda tekshirilgan).
- [ ] Kam qoldiq ro'yxati aynan `current_stock ≤ min_stock` bo'lgan materiallarni ko'rsatadi.
- [ ] Ombor qiymati hisoboti UZS va USD ko'rinishlarda muhrlangan daftar qiymatlari yig'indisiga teng.
- [ ] Rol matritsasi ta'minlangan: omborchi to'liq; sex boshlig'i faqat o'qiydi (yozishda 403); ishchi/sotuvchi hammasida 403.
- [ ] Daftar yozuvlari o'zgarmas — tranzaksiyalar uchun update/delete endpoint mavjud emas.

---

## 11. Ochiq savollar (Faza 1)

| # | Savol | Qachon hal qilinadi |
|---|-------|---------------------|
| 1 | CBU API tafsilotlari (endpoint, auth, ulanmasa fallback) | implementatsiya |
| 2 | Chiqimda erkin matn o'rniga aniq qabul qiluvchi (user FK) talab qilinsinmi? | birinchi real foydalanishdan keyin |
| 3 | Kirim hujjatini tuzatish siyosati — teskari hujjat vs faqat-admin bekor qilish | implementatsiya (standart: teskari hujjat) |

---

## 12. Keyingi qadam

Bu dizaynni `PHASE_0_FOUNDATION.md` bilan birga ko'rib chiqib tasdiqlash, so'ng Nx workspace'ni yaratib **Faza 0 + Faza 1**ni birinchi ishlatsa bo'ladigan bo'lak sifatida amalga oshirish (biznes reja §13).
