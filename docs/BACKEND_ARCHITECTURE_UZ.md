# Backend Arxitekturasi — Papka Tuzilmasi va Konventsiyalar

> **Holat:** Muhrlangan — hujjatlashtirilgan sababsiz qayta ko'rilmaydi
> **Oxirgi yangilanish:** 2026-07-15
> **Qamrov:** NestJS API (hozircha repo ildizidagi `src/`; Nx restrukturizatsiyasida `apps/api/src/` bo'ladi — ichki tuzilma o'zgarmaydi)
> **Bog'liq:** `../BUSINESS_PLAN.md` §9, `./PHASE_0_FOUNDATION.md`
> **Eslatma:** Bu tarjima; asl (canonical) hujjat — `BACKEND_ARCHITECTURE.md`.

---

## 1. Uch tayanch birlik

Har domen funksiyasi bitta modul bog'lagan uch sinfdan quriladi:

- **Module** — quti: feature nimalardan iboratligini e'lon qiladi.
- **Controller** — faqat HTTP qatlami: route'lar, so'rov kirdi, javob chiqdi. **Yupqa.**
- **Service** — biznes mantiq: qoidalar, hisob-kitob, repository chaqiriqlari. **Semiz.**

Ilova — ildiz `AppModule` ostidagi feature-modullar daraxti.

So'rov hayot yo'li (kesuvchi kod qayerga ulanadi):

```
So'rov → Middleware → Guard'lar → Interceptor (oldin) → Pipe (validatsiya)
       → Controller → Service → Interceptor (keyin) → Exception Filter → Javob
```

---

## 2. Muhrlangan papka tuzilmasi

```
src/
├── main.ts                          # bootstrap: /api prefiksi, global pipe'lar, CORS
├── app.module.ts                    # ildiz modul — faqat importlar, mantiq yo'q
│
├── config/                          # env validatsiya (Zod) + typeorm.config.ts
│   ├── env.validation.ts            #   env yetishmasa startda yiqiladi (fail-fast)
│   └── typeorm.config.ts            #   buildDataSourceOptions() — app.module VA
│                                    #   database/data-source.ts uchun yagona manba
│
├── shared/                          # FAQAT kesuvchi kod (2+ modul ishlatadigan)
│   ├── enums/                       #   Role, statuslar (keyin Nx'da libs/shared ga)
│   ├── decorators/                  #   @Roles(), @CurrentUser()
│   ├── guards/                      #   RolesGuard (avtorizatsiya matritsasi ijrochisi)
│   ├── filters/                     #   global xato formati
│   └── interceptors/
│
├── database/
│   ├── data-source.ts               # TypeORM CLI eshigi (migrationlar)
│   ├── migrations/                  # generatsiya + qo'lda yozilgan migrationlar
│   └── seeds/                       # birinchi admin, spravochnik ma'lumotlar
│
├── auth/                            # feature modul (Faza 0)
│   ├── auth.module.ts
│   ├── auth.controller.ts           # login, refresh, logout, me, change-password
│   ├── auth.service.ts              # token yaratish/rotatsiya/bekor qilish mantig'i
│   ├── auth.service.spec.ts         # test o'zi tekshirayotgan kod YONIDA yashaydi
│   ├── strategies/                  # Passport JWT strategiyasi
│   ├── guards/                      # JwtAuthGuard (feature'ga xos guard)
│   ├── dto/                         # so'rov/javob DTO'lari (Zod sxemalar)
│   └── entities/refresh-token.entity.ts
│
├── users/                           # feature modul (Faza 0)
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.service.spec.ts
│   ├── dto/                         # create-user.dto.ts, update-user.dto.ts
│   └── entities/user.entity.ts
│
└── <feature>/                       # Faza 1+: units/, materials/, suppliers/,
                                     # receipts/, stocktakes/ … xuddi shu shakl
```

---

## 3. Qoidalar

1. **Feature birinchi.** Fayl o'z feature-moduliga tegishli (`user.entity.ts`
   `users/entities/`da yashaydi), tur bo'yicha global papkalarga emas
   ("hamma entity bitta papkada" — taqiqlangan).
2. **`shared/` qattiq qo'riqlanadi.** Faqat chindan 2+ modul ishlatadigan kod.
   Axlatxonaga aylanmasligi shart; bitta modul ishlatsa — o'sha modulda yashaydi.
3. **Yupqa controller, semiz service.** Controller'da biznes mantiq yo'q —
   service'lar HTTP kontekstsiz testlanadi.
4. **Testlar yonma-yon:** `x.service.spec.ts` `x.service.ts` yonida turadi.
   Faqat e2e testlar yuqori darajadagi `test/` papkasida.
5. **Feature'ga xos guard/pipe'lar o'z feature'ida qoladi** (masalan `auth/guards/`);
   faqat matritsa-darajasidagilar (RolesGuard) `shared/guards/`da.
6. **Env'ga kirish — `config/`niki.** Modullar konfiguratsiyani `ConfigService`
   orqali o'qiydi; xom `process.env` faqat Nest'dan tashqarida ishlaydigan
   chegaralarда ruxsat etiladi (`database/data-source.ts`).
7. **Nomlash:** `<nom>.<tur>.ts` — `users.controller.ts`, `login.dto.ts`,
   `user.entity.ts`, `roles.guard.ts` (NestJS CLI konventsiyasi).
8. **Nx kelajagi:** butun `src/` o'z holicha `apps/api/src/`ga ko'chadi;
   `shared/enums` + DTO sxemalar admin frontend paydo bo'lganda `libs/shared`ga
   ko'tariladi (BUSINESS_PLAN §9.2).

---

## 4. Laravel → NestJS aqliy xarita

| Laravel | NestJS | Izoh |
|---|---|---|
| Controller | Controller | routing dekoratorlar bilan: `@Get(':id')` |
| Service / Action class | Service (Provider) | Laravel'da ixtiyoriy odat, Nest'da me'moriy standart |
| FormRequest | DTO + Pipe | bizda: nestjs-zod orqali Zod |
| Middleware | Middleware + Guard + Interceptor | bitta Laravel tushunchasi uchta hook'ka bo'lingan |
| Policy / Gate | Guard | `@Roles()` + RolesGuard |
| Exception Handler | Exception Filter | markaziy xato formati |
| Eloquent Model | Entity + Repository | Data Mapper: ma'lumot va amallar ajratilgan |
| ServiceProvider | Module + DI | DI avtomatik: constructor orqali |
