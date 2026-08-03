# Frontend Arxitekturasi — Admin Dashboard

> **Holat:** Dizayn yakunlangan, qurilish boshlandi
> **Chetlanish (2026-07-25):** Nx **kechiktirildi** (egasining qarori — avval mustaqil loyihalarda poydevorni o'rganish; `BUSINESS_PLAN.md` §12 #6). `apps/admin` hozircha o'z `package.json`iga ega mustaqil Vite loyihasi; API repo root'ida qoladi. Zod sxemalar `libs/shared` paydo bo'lguncha FE tomonda vaqtincha nusxalanadi.
> **Oxirgi yangilanish:** 2026-07-25
> **Qamrov:** Ichki admin dashboard (Faza 0 dan boshlab), Nx workspace'da `apps/admin` sifatida yashaydi. Mijoz storefront — alohida ilova (Faza 6, `apps/storefront`).
> **Bog'liq:** `./PHASE_0_FOUNDATION.md`, `../BUSINESS_PLAN.md` (§9 repo tuzilishi va API kontrakt)
> **Eslatma:** Bu tarjima; asl (canonical) hujjat — `FRONTEND_ARCHITECTURE.md`.

---

## 1. Maqsad va qamrov

Sex ERP'i uchun ichki **admin dashboard** qurish: rol bilan cheklangan, ma'lumotга to'la CRUD ilova, NestJS API'ni iste'mol qiladi. Bu hujjat dashboard faza-bafaza o'sadigan stack, struktura va konvensiyalarni belgilaydi.

Mijoz uchun storefront (Faza 6) ataylab **bu yerда qamrovdan tashqari** — u alohida ilova bo'ladi (SEO uchun ehtimol Next.js).

---

## 2. Texnologiya stack (yakunlangan)

| Soha | Tanlov | Nega |
|------|--------|------|
| Workspace | **Nx (integrated) + npm** — bu ilova `apps/admin` | Task keshi, affected-only CI, majburiy modul chegaralari; API bilan `libs/shared`ni bo'lishadi (`BUSINESS_PLAN.md` §9 ga qarang) |
| Framework | **Vite + React 19 + TypeScript** (SPA) | Ichki tool — SSR/SEO kerak emas; eng sodda, tez; NestJS API'dan toza ajralgan. Eng so'nggi: Vite 8.x, React 19.x |
| UI kutubxona | **Ant Design (v6)** | Tayyor Table/Form/DatePicker — ERP CRUD uchun ideal. v6 (2025 noyabrdan barqaror, eng so'nggi 6.4.x) React 18/19 ni qo'llaydi; v5→v6 migratsiya silliq |
| Styling | **Tailwind CSS v4** (utility-first) | Layout, bo'shliq, custom komponentlar. CSS-first config (`@theme`), `@tailwindcss/vite` plagini. AntD tokenlari bilan bitta palitrani bo'lishadi. `DESIGN_SYSTEM_UZ.md` §8 ga qarang |
| Routing | **React Router (v8, deklarativ rejim)** | Standart SPA routing. 2026-08-03 da v6 → v8 ko'tarildi: open-redirect CVE tuzatishlari (GHSA-wrjc-x8rr-h8h6 va b.) faqat v7.18+/v8 da chiqqan, v6 ga backport qilinmagan; bizning deklarativ API yuzamiz (`BrowserRouter/Routes/Route/useNavigate`) o'zgarmagan. Import `react-router` dan — v8 da `react-router-dom` paketi yo'q. Router state'dan kelgan redirect manzillari `shared/safePath.ts` orqali o'tadi |
| Server state | **TanStack Query (React Query)** | Kesh, refetch, mutatsiya — state'ning ~90% ini qoplaydi |
| Client/UI state | **Zustand** (yengil) | Minimal: auth/sessiya, UI sozlamalari. Redux yo'q |
| HTTP klient | **Axios** | JWT biriktirish + 401 boshqaruvi uchun interceptor |
| Forma va validatsiya | **React Hook Form + `libs/shared`dagi Zod sxemalari** | API (`nestjs-zod`) tekshiradigan *aynan o'sha* Zod sxemalar — bitta qoida, bitta joy, FE/BE drift nol |
| i18n | **react-i18next** | UZ / RU / EN |
| Auth tokenlar | **Access + refresh** (Variant B), **localStorage**'da | Sliding sessiya: faol → kirib turadi; 2h jim → logout. Tab/brauzer yopilsa ham qoladi |

---

## 3. Loyiha tuzilishi (feature-based)

Papkalar backend modullariga mos. Har bir feature mustaqil (`api`, `hooks`, `components`, `pages`). Ilova Nx workspace ichida `apps/admin`da yashaydi; kontrakt kodi (Zod sxemalar, enum'lar, rol matritsasi, API tiplari) `libs/shared`dan import qilinadi, bu yerda **hech qachon** qayta e'lon qilinmaydi.

```
apps/admin/
  index.html
  project.json                 # Nx loyiha konfiguratsiyasi
  vite.config.ts               # React + @tailwindcss/vite plaginlari
  .env                         # VITE_API_BASE_URL
  src/
    main.tsx
    App.tsx
    index.css                  # @import "tailwindcss" + @theme palitra (tokens.ts ni aks ettiradi)
    app/
      tokens.ts                # palitra (TS) — yagona manba
      theme.ts                 # AntD ConfigProvider tokenlari (tokens.ts dan import)
      providers.tsx            # ConfigProvider + StyleProvider(layer), QueryClient, i18n, Router
      router.tsx               # route ta'riflari
      queryClient.ts
    config/
      env.ts                   # import.meta.env ni o'qiydi (tiplangan)
      constants.ts
    shared/
      api/
        axios.ts               # axios instance + interceptorlar
        types.ts               # umumiy API tiplari (ApiError, Paginated<T>...)
      components/              # qayta ishlatiladigan: PageHeader, DataTable, ConfirmDialog
      hooks/
      lib/                     # jwt decode, formatterlar, helperlar
      i18n/
        index.ts
        locales/{uz,ru,en}.json
    layouts/
      DashboardLayout.tsx      # sidebar + topbar + content
      AuthLayout.tsx           # login ekrani layout
    features/
      auth/
        api/authApi.ts         # login, refresh, logout, me, change-password
        store/authStore.ts     # zustand: accessToken + refreshToken + user
        hooks/useAuth.ts
        components/RequireAuth.tsx   # route guard (kirgan)
        components/RequireRole.tsx   # route guard (rol ruxsat)
        pages/LoginPage.tsx
      users/                   # Faza 0: xodim boshqaruvi (faqat admin)
        api/usersApi.ts
        hooks/useUsers.ts
        components/{UserTable,UserForm}.tsx
        pages/{UsersListPage,UserFormPage}.tsx
      # keyingi fazalar: materials/, products/, production/, wages/, orders/...
```

---

## 4. Routing va layout

- **`AuthLayout`** — login sahifasi uchun minimal layout.
- **`DashboardLayout`** — sidebar navigatsiya + topbar (joriy user, til almashtirgich, logout) + content maydoni.
- Route'lar guruhlangan: ommaviy (`/login`) va himoyalangan (dashboard ostidagi hammasi).
- **Himoyalangan route'lar** elementlarni `RequireAuth` (kirgan bo'lishi shart) va `RequireRole` (rol ruxsat) bilan o'raydi — aks holda login'ga yo'naltiradi yoki 403 ko'rsatadi.
- **Sidebar menyusi rol bo'yicha filtrlanadi**: har element ruxsat etilgan rollarni e'lon qiladi; faqat joriy user roli ruxsat bergan elementlar ko'rinadi (`PHASE_0_FOUNDATION_UZ.md` §6 avtorizatsiya matritsasidan).

---

## 5. Autentifikatsiya va token boshqaruvi

**Model — Variant B (sliding sessiya).** Ikki token: qisqa muddatli **access token** (~15m) har so'rovga ketadi, va **refresh token** muddati — **2h inaktivlik oynasi**. Faollik access tokenni yangilab turadi (2h oynasini qaytadan boshlaydi) → user cheksiz kirib turadi. 2 soat jim → refresh muvaffaqiyatsiz → logout. Muddatlar backendда (`ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`); frontend ularni takrorlamaydi.

**Login oqimi.** `POST /api/auth/login { username, password }` → `{ accessToken, refreshToken, user }`. Hammasi `localStorage`'da saqlanadi va `authStore` (Zustand) to'ldiriladi.

**Saqlanish.** `localStorage` tab va brauzer yopilsa ham qoladi — faol sessiya reload'dan keyin davom etadi, va 2h jimlik qoidasi logout'ni boshqaradi.

**Axios interceptorlar.**
- *Request:* `Authorization: Bearer <accessToken>` ni biriktiradi.
- *Response:* `401`da (access tugagan) → `POST /api/auth/refresh { refreshToken }` chaqiradi; muvaffaqiyatда yangi tokenlarni saqlab **asl so'rovni qayta yuboradi**; muvaffaqiyatsizда (refresh tugagan/bekor → 2h jimlik, yoki deaktivatsiya) → auth tozalanadi + `/login`ga yo'naltiriladi.

**Single-flight refresh.** Bir vaqtdagi bir nechta 401 bitta refresh chaqiruvini bo'lishadi va qayta urinishlarni navbatga qo'yadi — token N marta emas, bir marta yangilanadi.

**Ilova ochilganda.** Tokenlar storage'dan o'qiladi; bo'lsa, sessiya optimistik to'ldiriladi — birinchi `401`/refresh tsikli haqiqiyligini tekshiradi. Token bo'lmasa → chiqilgan.

**"Faol" = so'rov yuborish.** Navigatsiya/interaksiya API chaqiruvlarni keltirib chiqaradi, bular sessiyani tirik tutadi. (Ixtiyoriy yaxshilash: access tokenni muddatdan oldin proaktiv yangilovchi timer, va/yoki UI'da aniq 2h da chiqaradigan idle-timer.)

**Xavfsizlik eslatmasi.** localStorage degani XSS tokenlarni o'qishi mumkin. Ichki tool uchun maqbul; React'ning standart escape'i, dependency ehtiyotkorligi va CSP bilan kamayadi. Auth/token mantig'i markazlashtirilgan (bitta `authStore` + Axios interceptor) — keyin **refresh tokenni httpOnly cookie**ga izolyatsiyalangan holda ko'chirsa bo'ladi (ochiqroq Faza 6 storefront uchun tavsiya etiladi).

---

## 6. API qatlami

- `shared/api/axios.ts` da bitta Axios instance — `baseURL = VITE_API_BASE_URL` va yuqoridagi interceptorlar bilan.
- Har feature'da `api/*.ts` moduli tiplangan funksiyalarни taqdim etadi (masalan `usersApi.list()`).
- **TanStack Query** ularni o'raydi: o'qish uchun `useQuery`, yozish uchun `useMutation`, mutatsiyadan keyin query-key invalidatsiya. Loading/error/empty holatlar Query tomonidan.

---

## 7. State boshqaruvi

- **Server state → TanStack Query.** Barcha API ma'lumoti (userlar, keyin materiallar/buyurtmalar…) Query keshida yashaydi. Server ma'lumoti uchun qo'lda global store yo'q.
- **Client/UI state → Zustand.** Faqat server ma'lumoti bo'lmagani: auth/sessiya (tokenlar, joriy user), UI sozlamalari (tanlangan til, sidebar yopiq). Juda kichik.
- **Redux yo'q** — bu ilova murakkabligi uchun keraksiz.

---

## 8. Forma va validatsiya

- Forma holati uchun **React Hook Form**; validatsiya uchun **Zod** sxemalari (TypeScript tiplari sifatida ham ishlatiladi).
- Ant Design inputlari RHF'ga `Controller` orqali ulanadi. Sodda holatlar uchun AntD'ning o'z `Form`i; murakkabroq uchun standart — RHF + Zod.
- Server tomon validatsiya xatolari (API'dan) tegishli maydonlarда ko'rsatiladi.

---

## 9. Xalqarolashtirish (i18n)

- **react-i18next**, uchta locale: `uz`, `ru`, `en` (`shared/i18n/locales` ostida JSON).
- **Barcha UI matnlari birinchi kundan tarjima kalitlari orqali** — uchta til kelishilgani uchun, qotib qolgan matn yo'q.
- **Standart til: o'zbekcha (`uz`).** Topbar'da til almashtirgich; tanlov `localStorage`'da saqlanadi.
- **Ant Design locale** tanlangan tilga `ConfigProvider locale` orqali moslanadi (`en_US`, `ru_RU`, va mavjud bo'lsa `uz_UZ`; aks holda fallback).
- Sana/raqamlar locale bo'yicha formatlanadi.

---

## 10. Styling va Ant Design konvensiyalari

Styling Tailwind v4 (utility/layout) va AntD (komponentlar) ni birlashtiradi. To'liq qoidalar — palitra yagona manba, `@apply`/`@reference`, AntD override tartibi, cascade layer — `DESIGN_SYSTEM_UZ.md` §8 da. Qisqacha:

- **Layout va bo'shliq → Tailwind utility** `className`да (`flex`, `gap-4`, `grid`, …).
- **AntD ko'rinishi → token** `app/theme.ts` da (asosiy yo'l). Qulay joyда AntD komponentига `className` Tailwind utility ber; `.ant-*` selektorlarini qo'lда tahrirlashдан saqlan.
- Takrorlanuvchi custom pattern → `@apply` bilan qurilган class (fayl `@reference "../index.css";` bilan boshlanadi).
- Ro'yxatlar AntD `Table` bilan, server-driven paginatsiya/saralash/filtr (React Query bilan).
- Formalar AntD inputlari bilan; CRUD ekranlarида bir xil `PageHeader` + amal tugmalari layout.
- Yupqa `shared/components` wrapper umumiy patternlarni standartlashtiradi (jadval sahifa, confirm-delete, forma sahifa).
- `providers.tsx` ilovani `ConfigProvider theme={theme}` va cascade layer bilan `StyleProvider` ga o'raydi — Tailwind utility'lar AntD ni `!important`siz override qila oladi.

---

## 11. Rol asosidagi UI

- Menyu elementlari va route'lar ko'rish/ishlatishga ruxsat etilgan rollarni e'lon qiladi.
- `RequireRole` route'larni himoyalaydi; sidebar ruxsatsiz elementlarni yashiradi.
- Bu backend avtorizatsiya matritsasiga aynan mos — UI va API ruxsatlarda kelishadi; matritsaning o'zi `libs/shared`da yashaydi (`PHASE_0_FOUNDATION.md` §6).

### 11.1 Worker ekranlari — mobil-first

Ishchilar (tikuvchi) tizimdan **sexda, telefondan** foydalanadi, desktopdan emas. Shuning uchun:

- `worker` roli ko'radigan sahifalar (Faza 3–4: *Mening vazifalarim*, *progress belgilash*) **mobil-first** ishlanadi: bitta ustun, katta bosish maydonlari (≥ 44px), minimal yozish — matn kiritish o'rniga tap va stepper.
- Dashboard'ning qolgani desktop-first qoladi (ma'lumotga zich jadvallar), planshetlarda yaxshi ko'rinadigan responsive asos bilan.
- Bu Faza 0 dan dizayn cheklovi (layout har rol uchun qat'iy sidebar deb hisoblamasligi kerak), Faza 3 da aniq amalga oshiriladi.

---

## 12. Muhit va config

`apps/admin/.env`:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

- **Token muddatlari frontend sozlamasi emas** — ular backend env (`ACCESS_TOKEN_TTL` ≈ `15m`, `REFRESH_TOKEN_TTL` = `2h` inaktivlik oynasi).
- `config/env.ts` `import.meta.env` qiymatlarini bitta joyda o'qiydi va tip tekshiradi.

---

## 13. Faza 0 frontend qamrovi (aniq ekranlar)

1. **Login sahifasi** (username + parol).
2. **Dashboard skeleti** — `DashboardLayout`, rol bo'yicha filtrlangan sidebar, topbar (user, til almashtirgich, logout).
3. **Users moduli (faqat admin):** ro'yxat (AntD Table), yaratish/tahrirlash (forma), deaktivatsiya (`is_active`).
4. **Parolimni o'zgartirish** ekrani.

Definition of done `PHASE_0_FOUNDATION_UZ.md` §11 ni UI tomonidan aks ettiradi: kirish, rolga mos menyu, admin sifatida userlarni boshqarish, faol holatda kirib turish (jim refresh), va 2 soat jimlikdan keyin chiqarib yuborilish.

---

## 14. Konvensiyalar

- TypeScript `strict`; ESLint + Prettier.
- Feature-based papkalar; komponent, hook, api, tiplar birga.
- Named export; PascalCase komponentlar; `useX` hooklar.
- `shared/` faqat haqiqatan featurelararo kod uchun.

---

## 15. Kelajakdagi rivojlanish

- **Storefront (Faza 6):** SEO uchun alohida Next.js ilova (`apps/storefront`); `libs/shared`ni va ehtimol UI lib'ni admin bilan bo'lishadi.
- **Umumiy tiplar:** ✅ hal qilindi — Zod sxemalari bilan `libs/shared` yagona haqiqat manbai (`BUSINESS_PLAN.md` §9.2).
- **Auth kuchaytirish:** kerak bo'lsa refresh tokenni httpOnly cookie'ga o'tkazish.

---

## 16. Keyingi qadam

Tasdiqdan keyin: Nx workspace'da `apps/admin`ni yaratish (React + Vite plagini) shu struktura bilan va Faza 0 ekranlarini (login, dashboard skeleti, users) Faza 0 API'ga qarshi amalga oshirish — Faza 0 backend bilan birga.
