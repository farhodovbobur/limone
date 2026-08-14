# Frontend Arxitekturasi — Admin Dashboard

> **Holat:** Dizayn yakunlangan, qurilish boshlandi
> **Chetlanish (2026-07-25):** Nx **kechiktirildi** (egasining qarori — avval mustaqil loyihalarda poydevorni o'rganish; `BUSINESS_PLAN.md` §12 #6). `apps/admin` hozircha o'z `package.json`iga ega mustaqil Vite loyihasi; API repo root'ida qoladi. Zod sxemalar `libs/shared` paydo bo'lguncha FE tomonda vaqtincha nusxalanadi.
> **Oxirgi yangilanish:** 2026-08-06
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
  package.json                 # mustaqil loyiha (Nx kechiktirilgan — sarlavhaga qarang)
  vite.config.mts
  .env                         # VITE_API_BASE_URL
  public/                      # design-system.html, icon-preview.html (ma'lumot doskalari)
  src/
    main.tsx
    index.css                  # Tailwind v4 @theme — ranglar, soyalar, shriftlar
    assets/logos/              # brend belgilari (SVG + PNG)
    app/
      providers.tsx            # QueryClient, AntD ConfigProvider, i18n, Router
      router.tsx               # marshrutlar + rol guard'lari
      queryClient.ts           # staleTime va boshqa query standartlari
      theme.ts, tokens.ts      # AntD mavzusi index.css bilan bir manbadan
    config/
      env.ts                   # import.meta.env ni o'qiydi (tiplangan)
    shared/
      api/axios.ts             # axios instansiyasi + interceptorlar
      session/                 # kirgan sessiya qancha yashashi (§5)
        activity.ts            # odam harakatini kuzatish, idle hisobi, tab qulfi
        token.ts               # access tokenning e'lon qilingan umrini o'qiydi
        endSession.ts          # sessiyani serverda, storage'da va tabda yopadi
      components/              # Avatar, Hangtag, Req, PasswordStrength, ErrorBoundary…
      access.ts                # rol x modul matritsasi (guard va nav uchun yagona manba)
      icons.tsx                # ikonka registri — ikonka kutubxonasini import qiladigan yagona fayl
      password.ts, phone.ts, safePath.ts
      i18n/index.ts, i18n/locales/{uz,ru,en}.json
    layouts/
      DashboardLayout.tsx      # sidebar + topbar + kontent, sessiya hook'ini mount qiladi
      AuthLayout.tsx           # login ekrani tartibi
      Sidebar.tsx, Topbar.tsx, UserMenu.tsx, Breadcrumbs.tsx
      nav.ts                   # nav elementlari, access.ts dan kelib chiqadi
    pages/
      DashboardHomePage.tsx
    features/
      auth/
        api/authApi.ts         # login, refresh, logout, me, change-password
        store/authStore.ts     # zustand: tokenlar + user + idle oynasi
        hooks/useSessionKeepAlive.ts   # faol ekan yangilash, ogohlantirish, chiqarish
        components/RequireAuth.tsx     # marshrut guard'i (kirganmi)
        components/RequireRole.tsx     # marshrut guard'i (rol ruxsat berilganmi)
        components/IdleWarning.tsx     # sanoq paneli
        pages/LoginPage.tsx
        schemas/login.schema.ts
      profile/                 # o'z hisobi: ma'lumot, parol, sessiyalar
        api/profileApi.ts
        components/{PersonalInfoCard,PasswordCard,SessionsCard}.tsx
        pages/ProfilePage.tsx
        schemas/{update-profile,change-password}.schema.ts
        lib.ts                 # qurilma yorliqlari, sana formatlash
      users/                   # Faza 0: foydalanuvchilarni boshqarish (faqat admin)
        api/usersApi.ts
        components/UserDrawer.tsx      # yaratish va tahrirlash bitta drawer'da
        pages/UsersPage.tsx
        schemas/user-form.schema.ts
      # keyingi fazalar: materials/, products/, production/, wages/, orders/...

Testlar tekshirayotgan narsasi yonida turadi (`*.test.ts`) va faqat sof
mantiqni qamraydi — access matritsasi, safePath, phone, password, sessiya
harakati va tokeni.
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

> **2026-08-06 da qayta ko'rildi.** Sliding-sessiya modeli o'zgarmadi, lekin
> quyida nomlangan uchta narsa birinchi qoralamadan keyin qurildi: "harakatsiz"
> endi HTTP trafigidan emas, **odam harakatidan** o'lchanadi; access token har
> so'rovda server holati bilan solishtiriladi; harakatsizlik oynasini frontend
> takrorlamaydi, uni API jo'natadi. Amalga oshirish tafsilotlari va ularni
> shakllantirgan xatolar: `FRONTEND.md`, `NESTJS.md` §13–§15.

**Model — Variant B (sliding sessiya).** Ikki token: qisqa muddatli **access
token** (~15m) har so'rovga ketadi, va **refresh token** muddati —
**2 soatlik harakatsizlik oynasi**. Davom etayotgan faollik access tokenni
yangilaydi va 2 soatlik oynani qaytadan boshlaydi → foydalanuvchi cheksiz kirib
turadi. 2 soat harakatsizlik → sessiya tugaydi. Ikkala muddat ham backendda
(`ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`); frontend ularni hech qachon
takrorlamaydi.

**Login oqimi.** `POST /api/auth/login { username, password }` →
`{ accessToken, refreshToken, sessionIdleMs, user }`. `localStorage`'da
saqlanadi va `authStore` (Zustand) to'ldiriladi.

`sessionIdleMs` — API haqiqatan hurmat qiladigan harakatsizlik oynasi. U
endigina berilgan refresh qatoridan hisoblanadi va **muddat sifatida
yuboriladi, absolyut vaqt sifatida emas** — brauzer uni o'z soatiga qo'shadi,
shu sababli ikki mashina soati hech qachon solishtirilmaydi. Demak
`REFRESH_TOKEN_TTL` o'zgarsa API'ni qayta ishga tushirish yetarli, frontendni
qayta qurish shart emas.

**Saqlanish.** `localStorage` tab va brauzer yopilsa ham qoladi, shuning uchun
faol sessiya reload'dan keyin davom etadi. `storage` tinglovchisi **boshqa
tablarda** store'ni yangilaydi: usiz ikkinchi tab birinchisi allaqachon
almashtirgan tokenni yuborishda davom etadi, almashtirilgan tokenni qayta
yuborish esa o'g'irlik deb qabul qilinadi.

**"Faol" degani odam, so'rov emas.** Mijoz `pointerdown`, `keydown`, `wheel` va
`touchstart` hodisalarini tinglaydi va oxirgi harakat vaqtini `localStorage`'da
saqlaydi (hamma tab uni baham ko'radi). `mousemove` **ataylab** hisobga
olinmaydi: turtilgan stol ishlayotgan odam emas, va uni sanash tashlab
ketilgan noutbukni tizimda ushlab turardi — qoida aynan shundan himoya qiladi.

Bu farq hal qiluvchi. Ilovadagi har qanday davriy so'rov (sessiyalar ro'yxati
har 30 soniyada yangilanadi) aks holda o'z `401`iga o'zi refresh bilan javob
berib, tashlab ketilgan tabni abadiy tirik saqlardi.

**Odam faol ekan** access token muddati tugashidan **oldin** yangilanadi —
shunda uzoq forma "Saqlash"dagi `401` tufayli yo'qolmaydi. Yangilash tablar
orasidagi qulf bilan cheklangan, chunki tablar bitta tokenni baham ko'radi va
chegaraga bir vaqtda yetadi.

**Chegaraga yaqinlashganda** (2 soatdan 2 daqiqa kam) sanoq paydo bo'ladi —
modal emas, **pastdagi panel**: har qanday haqiqiy harakat harakatsizlik
hisobini nolga qaytaradi, ya'ni stol yonidagi odam unga shunchaki ishda davom
etib javob beradi. Chegarada mijoz sessiyani o'zi tugatadi, serverdagi qatorni
bekor qiladi (shunda u qurilmalar ro'yxatidan darhol yo'qoladi) va
`/login?reason=idle` ga yo'naltiradi.

**Axios interceptorlar.**
- *Request:* `Authorization: Bearer <accessToken>` biriktiriladi.
- *Response:* `401`da avval harakatsizlik oynasi o'tib ketmaganini tekshiradi —
  o'tgan bo'lsa yangilamasdan sessiyani tugatadi (aynan shu narsa fondagi
  davriy so'rovning o'lgan sessiyani tiriltirishiga yo'l qo'ymaydi). Aks holda
  `POST /api/auth/refresh { refreshToken }` chaqiradi, yangi tokenlarni saqlab
  **asl so'rovni qayta yuboradi**; muvaffaqiyatsizlikda auth tozalanadi va
  `/login` ga yo'naltiriladi.

**Single-flight refresh.** Bir vaqtdagi bir nechta 401 bitta refresh
chaqiruvini bo'lishadi va qayta urinishlarni navbatga qo'yadi — token N marta
emas, bir marta yangilanadi. Yuqoridagi oldindan yangilash **xuddi shu**
funksiyani chaqiradi, shuning uchun ikki yo'l poyga qila olmaydi.

**Ilova ochilganda.** Tokenlar storage'dan o'qiladi; bo'lsa, sessiya optimistik
to'ldiriladi — birinchi so'rov haqiqiyligini tekshiradi. Token bo'lmasa →
chiqilgan.

**Server tomonidagi sessiya tekshiruvi.** Imzolangan access tokenning o'zi
yetarli emas: API token ichidagi `sid` da'vosi ko'rsatgan sessiya qatori hali
tirikligini ham tekshiradi. Usiz "Boshqa qurilmalardan chiqish" faqat
*keyingi* yangilanishni to'sardi, bekor qilingan qurilma esa o'zining qolgan
15 daqiqasini ishlab yurardi. Narxi — har so'rovda bitta primary-key qidiruvi.

**Rate limiting.** `POST /auth/login` va `POST /auth/change-password`
**(hisob, IP)** juftligi bo'yicha cheklangan — faqat IP bo'yicha emas, chunki
butun ustaxona bitta ofis manzilini baham ko'radi va IP bo'yicha cheklash bir
kishining xato terishi bilan hammani qulflab qo'yardi. UI `429` ni umumiy xato
o'rniga o'z xabariga bog'laydi.

**Xavfsizlik eslatmasi.** localStorage degani XSS tokenlarni o'qishi mumkin.
Ichki tool uchun maqbul; React'ning standart escape'i va dependency
ehtiyotkorligi bilan kamayadi. **Content-Security-Policy hali qo'yilmagan** —
bu shu yerdagi eng katta ochiq bo'shliq, va u hal qilinmagan deploy nishoniga
bog'liq (`BUSINESS_PLAN.md` §12 #2), chunki admin bundle'i hozir bizning nginx
orqali xizmat qilinmaydi. Auth/token mantig'i markazlashtirilgan (bitta
`authStore` + Axios interceptor), shuning uchun **refresh tokenni httpOnly
cookie**ga izolyatsiyalangan holda ko'chirish mumkin — ochiqroq Faza 6
storefront uchun tavsiya etiladi.

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
