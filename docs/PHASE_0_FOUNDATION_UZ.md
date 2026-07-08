# Faza 0 — Poydevor (Identifikatsiya va Kirish)

> **Holat:** Dizayn yakunlangan, hali qurilmagan
> **Oxirgi yangilanish:** 2026-07-05
> **Stack:** Nx monorepo (`apps/api`) · NestJS 11 · PostgreSQL 18 · TypeORM 1.0 · TypeScript 5.9 · Node 24 LTS · JWT · Zod (`nestjs-zod`)
> **Bog'liq:** `../BUSINESS_PLAN.md` (§9 repo tuzilishi va API kontrakt)
> **Eslatma:** Bu tarjima; asl (canonical) hujjat — `PHASE_0_FOUNDATION.md`.

---

## 1. Maqsad

Keyingi barcha fazalar tayanadigan identifikatsiya va kirish poydevorini qurish: **xodimlar autentifikatsiyasi, `users` jadvali, rollar va rol asosidagi avtorizatsiya** — hamda ilova skeleti (config, validatsiya, xato formati, CORS).

Faza 0 da yakuniy foydalanuvchi uchun biznes funksiyasi yo'q; uning qiymati — busiz boshqa hech narsa xavfsiz qurilmaydi.

---

## 2. Qamrov

**Qamrovda**
- `users` jadvali (faqat xodim akkauntlari)
- `enum` ustun orqali bitta-rol modeli
- Autentifikatsiya: username + parol login; **qisqa access token + sliding refresh token** (Variant B, §7)
- Avtorizatsiya: rol asosidagi guard'lar
- Admin tomonidan akkaunt boshqaruvi (yaratish, tahrirlash, deaktivatsiya, parol tiklash)
- Birinchi admin — seed skript orqali
- Ilova skeleti: global validatsiya (**Zod, `nestjs-zod` orqali; sxemalar `libs/shared`da** — `BUSINESS_PLAN.md` §9.2 ga qarang), strukturali xato formati, logging, CORS, `/api` prefiksi, `.env` orqali config

**Qamrovdan tashqari (non-goals)**
- Mijoz akkauntlari → Faza 5/6 (alohida `customers` jadvali)
- Bir userda bir nechta rol / RBAC ruxsatlar jadvali → hozir emas (bitta enum, §3)
- Dinamik, admin yaratadigan rollar → rollar qat'iy, seed qilingan enum
- Ishchining ish haqi/mahorat ma'lumoti → Faza 4 (alohida `employee` jadvali)
- O'lchov birliklari va kategoriya spravochniklari → o'z fazalariga qoldiriladi (o'lchov birliklari Faza 1 — Material ombori bilan va h.k.). *Bu `BUSINESS_PLAN_UZ.md` §6 dagi eslatmani aniqlashtiradi.*
- Xodimlar uchun ommaviy ro'yxatdan o'tish → xodim akkauntini admin yaratadi

---

## 3. Yakunlangan qarorlar

| # | Qaror | Sabab |
|---|-------|-------|
| Q1 | Login **`username`** orqali (asosiy, unique, majburiy). `phone` va `email` **nullable**. | Sex xodimida username doim bor, email har doim emas; telefon ixtiyoriy aloqa sifatida. |
| Q1 | Ism **`first_name` + `last_name`** alohida (bitta maydon emas). | Saralash, ko'rsatish va formatlash uchun toza. |
| Q2 | **Bir userda bitta rol**, `enum` ustun. | Kichik sex; har kim bitta ish qiladi. M2M dan sodda; kerak bo'lsa keyin migratsiya (§13). |
| Q3 | **Xodim va mijoz alohida jadvallar**, keyin `customers.staff_user_id` orqali bog'lanadi. | Auth oqimi va maydonlar har xil; overlap bog'lovchi FK bilan. |
| Q4 | `users` faqat **auth uchun**; ishchiga xos ma'lumot Faza 4 da alohida jadvalda. | `users`ni toza saqlaydi; ish haqi/mahorat maydonlari har bir akkauntga tegishli emas. |
| Q5 | **Sliding sessiya (Variant B): qisqa access token + refresh token.** Faol user kirib turadi; `REFRESH_TOKEN_TTL` (2h) jim tursa → logout. | "Faol = cheksiz, jim = 2h" semantikasiga mos; sessiyani bekor qilish imkonini beradi (deaktivatsiya qilingan xodim chiqarib yuboriladi). |

---

## 4. `users` jadvali (yakuniy struktura)

| Ustun | Tur | Cheklov | Izoh |
|-------|-----|---------|------|
| `id` | int (serial) | PK | |
| `username` | varchar(50) | **unique, not null** | Login identifikatori |
| `password_hash` | varchar | not null, **standart qaytarilmaydi** | bcrypt; javoblarда hech qachon ko'rinmaydi |
| `first_name` | varchar(100) | not null | |
| `last_name` | varchar(100) | not null | |
| `phone` | varchar(20) | nullable, unique | Normallashtirilgan, E.164 (masalan `+99890...`) |
| `email` | varchar(150) | nullable, unique | Ixtiyoriy |
| `role` | enum | not null | §5 ga qarang |
| `is_active` | boolean | not null, default `true` | O'chirish o'rniga deaktivatsiya |
| `created_at` | timestamptz | not null, default now | |
| `updated_at` | timestamptz | not null, auto | |

Izohlar:
- **Nullable + unique** PostgreSQL'da muammosiz — bir nechta `NULL` ruxsat etiladi, demak telefonsiz/emailsiz bir nechta xodim bemalol bo'la oladi.
- **Hard delete yo'q.** Akkaunt deaktivatsiya qilinadi (`is_active = false`) — audit va kelajakdagi ish haqi tarixi saqlanadi.
- `password_hash` TypeORM'da `select: false` bilan; faqat login paytida aniq yuklanadi.

---

## 5. Rollar

Qat'iy, seed qilingan enum. Besh rol:

| Kod | Nomi | Vazifasi |
|-----|------|----------|
| `admin` | Admin / Ega | To'liq kirish, sozlash, hisobotlar |
| `warehouse_keeper` | Omborchi | Material va tayyor kiyim KIRIM/CHIQIM, qoldiq |
| `workshop_manager` | Sex boshlig'i | Ishlab chiqarish, vazifa biriktirish, status |
| `worker` | Tikuvchi | O'ziga berilgan vazifalarni ko'radi, holatini yangilaydi |
| `sales` | Sotuvchi | Buyurtmalar, mijozlar, qoldiqni ko'rish |

Rol faqat **admin** tomonidan, user yaratish yoki tahrirlashda biriktiriladi/o'zgartiriladi.

---

## 6. Avtorizatsiya matritsasi (maqsadli)

Ko'p modullar keyingi fazalarga tegishli; bu — **maqsadli kirish xaritasi**, har faza modullari chiqqanda aniqlashtiriladi. `R` = o'qish, `W` = yozish/boshqarish, `—` = kirish yo'q, `own` = faqat o'z yozuvlari.

| Modul / Rol | admin | warehouse_keeper | workshop_manager | worker | sales |
|-------------|:-----:|:----------------:|:----------------:|:------:|:-----:|
| User boshqaruvi | RW | — | — | — | — |
| Material ombori | RW | RW | R | — | — |
| Tayyor kiyim ombori | RW | RW | R | — | R |
| Katalog (model/variant) | RW | R | R | — | R |
| Norma (BOM) | RW | — | RW | — | — |
| Ishlab chiqarish | RW | — | RW | own | — |
| Ish haqi | RW | — | R | own | — |
| Sotuv / Buyurtma | RW | — | — | — | RW |
| Mijozlar | RW | — | — | — | RW |
| Hisobot / statistika | RW | R (ombor) | R (ishlab chiqarish) | — | R (sotuv) |

Faza 0 da yagona himoyalangan resurs — **User boshqaruvi (faqat admin)**; matritsaning qolgani keyingi fazalar amalga oshiradigan kontrakt.

---

## 7. Autentifikatsiya dizayni

**Akkaunt yaratish** — xodimlar uchun self-registration yo'q. Admin akkaunt yaratadi (username, ism/familiya, rol, vaqtinchalik parol). Ixtiyoriy, lekin tavsiya etiladi: birinchi kirishda parolni majburiy o'zgartirish.

**Token modeli (Variant B — sliding sessiya).** Ikki token:

- **Access token** — qisqa muddatli (`ACCESS_TOKEN_TTL`, masalan `15m`), har so'rovga `Authorization: Bearer` sifatida ketadi. `JWT_ACCESS_SECRET` bilan imzolanadi.
- **Refresh token** — sessiyani bildiradi; muddati — **inaktivlik oynasi** (`REFRESH_TOKEN_TTL` = `2h`). `JWT_REFRESH_SECRET` bilan imzolanadi va rotatsiya/bekor qilish uchun **serverда (hashlangan holda) saqlanadi**.

**Nega ikki token:** user faol bo'lsa, muddati tugayotgan access token refresh token orqali jim yangilanadi, va har yangilanish 2h oynasini qaytadan boshlaydi — shuning uchun faol user **cheksiz kirib turadi**. 2 soat jim tursa, refresh token tugaydi va keyingi yangilash muvaffaqiyatsiz bo'ladi → **logout**.

**Access token payload**
```json
{ "sub": <userId>, "username": "<username>", "role": "<role>" }
```

**Login** — `POST /api/auth/login` `{ username, password }` → `{ accessToken, refreshToken, user }` (`password_hash`siz). Refresh-token yozuvi `expires_at = now + REFRESH_TOKEN_TTL` bilan yaratiladi.

**Refresh** — `POST /api/auth/refresh` `{ refreshToken }`. Tekshiradi (mavjud, bekor qilinmagan, muddati o'tmagan), so'ng **rotatsiya**: eski tokenni bekor qiladi, yangi access + yangi refresh beradi (yangi 2h muddat). Ikkalasini qaytaradi.

**Logout** — `POST /api/auth/logout` joriy refresh tokenni bekor qiladi.

**Parollar** — bcrypt bilan hash. User o'z parolini o'zgartira oladi; admin boshqa userning parolini tiklay oladi. Parol o'zgarsa/tiklansa, o'sha userning refresh tokenlari bekor qilinadi.

**Birinchi admin** — seed skript (`npm run seed`) orqali, masalan `admin` / vaqtinchalik parol, roli `admin`. Birinchi kirishdan keyin parol o'zgartirilishi kerak.

---

## 8. API endpointlar (Faza 0)

Hammasi `/api` ostida.

| Metod | Yo'l | Kirish | Maqsad |
|-------|------|--------|--------|
| POST | `/auth/login` | Ommaviy | Kirish, access + refresh token qaytaradi |
| POST | `/auth/refresh` | Ommaviy (to'g'ri refresh token) | Rotatsiya: yangi access + refresh |
| POST | `/auth/logout` | Auth | Joriy refresh tokenni bekor qilish |
| GET | `/auth/me` | Auth | Joriy user profili |
| POST | `/auth/change-password` | Auth | O'z parolini o'zgartirish (refresh tokenlarni bekor qiladi) |
| POST | `/users` | Admin | Xodim akkaunti yaratish |
| GET | `/users` | Admin | Xodimlar ro'yxati |
| GET | `/users/:id` | Admin | Bitta xodim |
| PATCH | `/users/:id` | Admin | Profil / rol / `is_active` ni yangilash |
| POST | `/users/:id/reset-password` | Admin | Userning parolini tiklash |

> `DELETE` yo'q — deaktivatsiya `PATCH … { is_active: false }` orqali.

---

## 9. Data model eskizi

**Role enum** — bir marta `libs/shared`da e'lon qilinadi va `apps/api` ham, `apps/admin` ham import qiladi (hech qachon takrorlanmaydi):
```
ADMIN = 'admin'
WAREHOUSE_KEEPER = 'warehouse_keeper'
WORKSHOP_MANAGER = 'workshop_manager'
WORKER = 'worker'
SALES = 'sales'
```

**DDL (namuna)**
```sql
CREATE TYPE user_role AS ENUM
  ('admin','warehouse_keeper','workshop_manager','worker','sales');

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR      NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  UNIQUE,
  email         VARCHAR(150) UNIQUE,
  role          user_role    NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Refresh tokenlar (Variant B): hashlangan saqlanadi, rotatsiya qilinadi, bekor qilsa bo'ladi.
CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR     NOT NULL,          -- refresh tokenning hashi, hech qachon xom qiymat emas
  expires_at  TIMESTAMPTZ NOT NULL,          -- now + REFRESH_TOKEN_TTL (har refresh'да suriladi)
  revoked_at  TIMESTAMPTZ,                   -- rotatsiya/logout/bekor qilishда o'rnatiladi
  replaced_by INT REFERENCES refresh_tokens(id), -- rotatsiya zanjiri (reuse detection)
  user_agent  VARCHAR,                       -- ixtiyoriy: qurilma/sessiya ma'lumoti
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

TypeORM'da bu `User` entity (`role` uchun `@Column({ type: 'enum', enum: Role })`, `password_hash` uchun `@Column({ select: false })`) va `User`ga `ManyToOne` bog'langan `RefreshToken` entity.

---

## 10. Xavfsizlik mulohazalari

- Parol hash uchun bcrypt; `password_hash` javoblarga hech qachon chiqmaydi.
- Faqat `admin` akkaunt yarata oladi yoki rol o'zgartira oladi — ommaviy xodim registration endpoint yo'q.
- Minimal parol uzunligi (masalan ≥ 8 belgi); seed/vaqtinchalik parolni majburiy o'zgartirish tavsiya etiladi.
- Global **`ZodValidationPipe`** (`nestjs-zod`); so'rov sxemalari strict object, shuning uchun noma'lum maydonlar rad etiladi. Aynan shu sxemalar admin UI formalarini ham tekshiradi (`libs/shared`).
- JWT secretlar (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) `.env` dan; hech qachon commit qilinmaydi. Access va refresh uchun alohida secret.
- Deaktivatsiya qilingan user (`is_active = false`) loginда rad etiladi.
- **Refresh tokenlar hashlangan saqlanadi** (xom emas) va har refreshда **rotatsiya** qilinadi; eskisi bekor qilinadi.
- **Reuse detection:** allaqachon bekor qilingan refresh token kelsa (o'g'irlik ehtimoli), o'sha userning barcha refresh tokenlari bekor qilinadi.
- **Deaktivatsiyaда bekor qilish:** `is_active = false` qilinsa, userning refresh tokenlari bekor qilinadi → u yangilab ololmaydi va bitta access TTL ichida (≤ 15m) chiqarib yuboriladi. Darhol uzish kerak bo'lsa, guard qo'shimcha ravishda `is_active`ni tekshirishi mumkin.

---

## 11. Qabul mezonlari (Definition of Done)

- [ ] Seed qilingan admin username + parol bilan kira oladi.
- [ ] Admin tanlangan rol bilan xodim yarata oladi.
- [ ] Yaratilgan user kira oladi va **access + refresh token** oladi.
- [ ] Muddati tugagan access token `/auth/refresh` orqali jim yangilanadi (faol sessiya davom etadi).
- [ ] **2 soat jimlikdan** keyin refresh muvaffaqiyatsiz bo'ladi va user chiqariladi.
- [ ] `/auth/refresh` refresh tokenni **rotatsiya** qiladi (eskisi ishlamaydi).
- [ ] `GET /auth/me` joriy userni `password_hash`siz qaytaradi.
- [ ] Rol bilan himoyalangan endpoint noto'g'ri rolga **403**, to'g'risiga **200** qaytaradi.
- [ ] Deaktivatsiya qilingan user kira olmaydi va faol sessiyaning refreshи deaktivatsiyaда bekor qilinadi.
- [ ] `password_hash` hech bir API javobida ko'rinmaydi.
- [ ] Noma'lum so'rov maydonlari validatsiyada rad etiladi.

---

## 12. Mavjud kod bilan bog'liqlik

**Bu repoda oldingi auth yoki domen kodi yo'q** — faqat ildizdagi toza `nest new` skeleti. Eski hujjat tahrirlarida tilga olingan e-commerce skeleti (email login, Products/Categories CRUD) bu repodan tashqarida va **ko'chirilmaydi**; bu dizayn uni butunlay almashtiradi.

Shuning uchun implementatsiya toza boshlanadi:

1. Skeletni `BUSINESS_PLAN.md` §9 bo'yicha Nx workspace'ga qayta tuzish (`apps/api`, `apps/admin`, `libs/shared`).
2. Faza 0 ni `apps/api` ichida aynan shu hujjatdagidek qurish: username login, access + refresh token (Variant B), `refresh_tokens` jadvali, faqat admin yaratadigan akkauntlar (ommaviy register yo'q), env'lar: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`.
3. Domen modullari (materiallar, modellar, norma, ishlab chiqarish, buyurtmalar) Faza 1 dan boshlab modellanadi — umumiy Products/Categories CRUD yo'q.

---

## 13. Kelajakdagi rivojlanish

- **Bir nechta rol kerak bo'lsa?** `role` enum'ni `roles` jadvali + `user_roles` (M2M) ga migratsiya. Izolyatsiyalangan migratsiya; guard "rol bor" dan "kerakli rollardan biri bor" ga o'zgaradi.
- **Granular ruxsatlar kerak bo'lsa?** `permissions` jadvali qo'shib, rollarni kodда emas, DB'da ruxsatlarga bog'lash.
- **Mijoz bilan yagona identity (SSO)?** Party/partner modeliga o'tish (bitta shaxs yozuvi, bir nechta persona). Faqat overlap kattalashsa.

---

## 14. Keyingi qadam

Faza 1 ning batafsil dizayni endi mavjud: **`PHASE_1_MATERIAL_WAREHOUSE.md`** (materiallar, yetkazib beruvchilar, birliklar, multi-currency daftar, inventarizatsiya). Ikkala dizayn tasdiqlangach: Nx workspace yaratiladi, so'ng Faza 0 + Faza 1 birinchi ishlatsa bo'ladigan bo'lak sifatida, `BUSINESS_PLAN.md` §7 muhandislik standartlari bilan birga amalga oshiriladi.
