# Dizayn Tizimi — LIMONÉ Admin

> **Holat:** Dizayn yakunlangan, hali qurilmagan
> **Oxirgi yangilanish:** 2026-07-05
> **Qamrov:** Ichki admin dashboard. Mijoz do'koni (Faza 6) buni kengaytirishi mumkin.
> **Eslatma:** Bu tarjima; asl (canonical) hujjat — `DESIGN_SYSTEM.md`.
> **Yondashuv:** To'liq custom design token (preset emas). Faqat light mode.
> **Styling:** Tailwind CSS v4 (utility-first) + Ant Design v6 (komponent token), bitta umumiy palitra.
> **Bog'liq:** `./FRONTEND_ARCHITECTURE_UZ.md`

---

## 1. Brend asosi

LIMONÉ APPAREL — kiyim brendi ("limone" — italyancha "limon"). Brend dunyosi (hangtag, etiketka, paket, kiyim g'ilofi) izchil: **krem / sutli-sariq fon + zaytun-limon (olive-citron) yashil logo**, serif wordmark.

Admin UI dizayn tamoyillari:

- **Tinch va premium**, baqiroq emas. Ko'p bo'sh joy (whitespace).
- **Rang rolни bildiradi, bezakni emas.** Zaytun = harakat; krem = brend yuzasi; oq = ma'lumot maydoni.
- **Avval o'qiluvchanlik.** Ma'lumotга to'la jadval va formalar o'qilishi oson bo'lishi kerak — ish maydoni oq, brend rangi urg'u.
- **Brend his qilinadi, baqirmaydi.** Zaytun va krem faqat "chrome"да (sidebar, header, jadval sarlavhasi, asosiy tugma), butun ekranni bosib ketmaydi.

> Quyidagi aniq HEX qiymatlari logodан ko'z bilan olingan (rasmий brend-rang hujjati hali yo'q). Zaytun ramp keyin xom logo yashilидан biroz to'qroq sozlandi — toki tugmadagi oq matn WCAG AA dan o'tsin (§3 ga qarang). Keyin vektor logo yoki brendбук chiqsa, bu tokenlarni rasmий qiymatlar bilan moslang — bosma (etiketka) va ekran mos kelishi kerak.

---

## 2. Rang tokenlari

### 2.1 Brend — Zaytun (asosiy ramp)

Logoning zaytun-limon yashilидан olingan, accessibility uchun sozlangan. `600` — asosiy harakat rangi; `400` — xom logo accent (faqat bezak).

| Token | HEX | Ishlatish |
|-------|-----|-----------|
| `olive-50` | `#F6F7EA` | Eng och tini, qator hover |
| `olive-100` | `#E7EBC4` | Tanlangan qator, tag/badge foni |
| `olive-200` | `#D3DA96` | Zaytun fonда chegaralar |
| `olive-300` | `#B9C264` | Bezak |
| `olive-400` | `#A8B04A` | **Xom logo accent** — faqat bezak foni, matn foni emas (§3 ogohlantirish) |
| `olive-500` | `#8A9340` | Bezak / accent hover |
| `olive-600` | `#6F762F` | **Primary** — tugma, link, faol holat (oq matn AA dan o'tadi) |
| `olive-700` | `#5A6126` | Primary hover/bosilgan, tanlangan menyu foni, kuchli link |
| `olive-800` | `#454B1C` | Och/krem/tini fonдаги matn, jadval sarlavhasi matni |
| `olive-900` | `#2F3312` | Eng to'q, tinida sarlavha |

### 2.2 Brend — Krem (yuza ramp)

Sutli-sariq brend foni, faqat chrome yuzalarи uchun — ma'lumot ish maydoni sifatida emas.

| Token | HEX | Ishlatish |
|-------|-----|-----------|
| `cream-50` | `#FEFEF7` | Zo'rg'a sezilar issiq oq |
| `cream-100` | `#FBF9E8` | **Sidebar, header, jadval sarlavhasi** foni |
| `cream-200` | `#F5F1CF` | Krem chegara/ajratgich |
| `cream-300` | `#ECE6B3` | Kuchliroq krem qirra |

### 2.3 Neytrallar

| Token | HEX | Ishlatish |
|-------|-----|-----------|
| `bg-base` | `#FFFFFF` | **Ish maydoni** — content, kartalar, jadvallar |
| `bg-subtle` | `#F7F7F4` | Kartalar ortidagi sahifa foni |
| `text-primary` | `#2C2E22` | Asosiy matn (issiq deyarli qora) |
| `text-secondary` | `#5F614E` | Muted yorliq, izoh |
| `text-tertiary` | `#8A8B7C` | Hints, placeholder (faqat UI/large — §3) |
| `border` | `#E6E6DD` | Standart 1px chegara |
| `border-strong` | `#CFCFC2` | Hover/urg'u chegara |

### 2.4 Status (semantik — ataylab brend ramp'dan TASHQARIDA)

Status ranglari brend zaytunидан vizual farqli bo'lishi shart — toki "muvaffaqiyat" "brend rangi" bilan chalkashmasin.

| Ma'no | Fon | Matn/Ikona |
|-------|-----|------------|
| Muvaffaqiyat | `#EAF3DE` | `#3B6D11` |
| Ogohlantirish | `#FAEEDA` | `#854F0B` |
| Xato/Xavf | `#FCEBEB` | `#A32D2D` |
| Ma'lumot | `#E6F1FB` | `#185FA5` |

---

## 3. Tekshirilgan kontrast (WCAG 2.1 AA)

Dasturiy hisoblangan (sRGB nisbiy yorug'lik). AA: oddiy matn ≥ 4.5, katta matn / UI ≥ 3.0.

| Juftlik | Nisbat | Xulosa |
|---------|------:|--------|
| Oq `olive-600` `#6F762F` ustida (tugma) | 4.65 | ✓ AA matn |
| Oq `olive-700` `#5A6126` ustida (hover/tanlangan) | 5.64 | ✓ AA matn |
| Siyoh `#2C2E22` oq ustida (asosiy) | 13.81 | ✓ AA matn |
| Siyoh `cream-100` `#FBF9E8` ustida (chrome) | 13.03 | ✓ AA matn |
| `olive-800` `#454B1C` `cream-100` ustida (jadval sarlavhasi) | 8.48 | ✓ AA matn |
| `olive-600` oq ustida (link) | 4.65 | ✓ AA matn |
| `olive-700` oq ustida (kuchli link) | 5.64 | ✓ AA matn |
| `text-secondary` `#5F614E` oq ustida | 6.35 | ✓ AA matn |
| `olive-800` `olive-100` `#E7EBC4` ustida (tag) | 7.27 | ✓ AA matn |
| Muvaffaqiyat `#3B6D11` / `#EAF3DE` | 5.43 | ✓ AA matn |
| Ogohlantirish `#854F0B` / `#FAEEDA` | 5.87 | ✓ AA matn |
| Xavf `#A32D2D` / `#FCEBEB` | 6.13 | ✓ AA matn |
| Ma'lumot `#185FA5` / `#E6F1FB` | 4.65 | ✓ AA matn |
| `text-tertiary` `#8A8B7C` oq ustida | 3.31 | ✓ faqat UI/large (hint/placeholder) |
| **Oq `olive-400` `#A8B04A` ustida** | **2.34** | **✗ YIQILADI — hech qachon matn** |

**Bundan kelib chiqadigan qoidalar:**

1. `olive-400` (xom logo yashili) **hech qachon** matn ko'tarmaydi va tugma/menyu rangi **emas** — faqat bezak foni.
2. Barcha harakat rangi `olive-600` (standart) / `olive-700` (hover, tanlangan) ishlatadi.
3. `text-tertiary` faqat placeholder/hint uchun (u 4.5 dan past); ma'noли matn uchun ishlatma.

---

## 4. Tipografiya

| Token | Qiymat | Ishlatish |
|-------|--------|-----------|
| `font-sans` | Inter (fallback: system-ui, -apple-system, "Segoe UI", Roboto) | Butun UI: jadval, forma, matn |
| `font-serif` | Logoga yaqin serif (masalan Cormorant Garamond / Playfair Display) | Faqat logo wordmark, login sarlavhasi, sahifa hero |
| `font-mono` | ui-monospace, "SF Mono", Menlo | ID, kod, SKU |

Tipografiya shkalasi (sans):

| Rol | O'lcham / qator balandligi / og'irlik |
|-----|----------------------------------------|
| Display (login) | 32 / 1.2 / 500 |
| H1 sahifa sarlavhasi | 22 / 1.3 / 500 |
| H2 bo'lim | 18 / 1.4 / 500 |
| H3 | 16 / 1.4 / 500 |
| Asosiy matn | 14 / 1.6 / 400 |
| Kichik / izoh | 12 / 1.5 / 400 |

Og'irliklar: faqat **400 oddiy, 500 medium** (600/700 yo'q — tinch UI uchun og'ir). Logo wordmarkдан tashqari hamma joyда sentence case.

---

## 5. Bo'shliq, radius, balandlik (elevation)

**Bo'shliq shkalasi (4px asos):** `4, 8, 12, 16, 24, 32, 48`. Komponent ichi gap px'da; vertikal ritm 8 ning karralарида.

**Radius:** `sm 4` (tag, ichki input) · `md 8` (tugma, input, karta) · `lg 12` (panel, modal) · `pill 999` (status chip).

**Elevation (juda yumshoq — premium, og'ir emas):**

| Token | Soya |
|-------|------|
| `shadow-sm` | `0 1px 2px rgba(44,46,34,0.06)` |
| `shadow-md` | `0 2px 8px rgba(44,46,34,0.08)` |
| `shadow-lg` | `0 8px 24px rgba(44,46,34,0.10)` |

Ajratish uchun soyadan ko'ra chegara afzal; soya faqat overlay uchun (dropdown, modal, popover).

---

## 6. Komponent ishlatish xaritasi

| Yuza | Token |
|------|-------|
| Ilova foni | `bg-subtle` `#F7F7F4` |
| Content / karta / jadval | `bg-base` oq |
| Sidebar | `cream-100`; faol element `olive-700` fon + oq matn; hover `olive-50` |
| Header / topbar | `cream-100`, pastki chegara `cream-200` |
| Jadval sarlavha qatori | `cream-100`, sarlavha matni `olive-800` |
| Jadval qator hover | `olive-50` |
| Tanlangan qator | `olive-100` |
| Primary tugma | `olive-600` fon, oq matn; hover `olive-700` |
| Secondary tugma | oq fon, `border`, `text-primary`; hover `olive-50` |
| Link | `olive-600` (hover `olive-700`) |
| Tag/badge (brend) | `olive-100` fon, `olive-800` matn |
| Status chip | §2.4 juftliklar |
| Focus ring | 2px `olive-600`, 40% shaffoflik |

---

## 7. Ant Design v6 mapping (`ConfigProvider`)

`ConfigProvider`да `theme` orqali to'liq custom token, `src/app/theme.ts` da markazlashgan. Faqat light algoritm.

### 7.1 Global `token`

```ts
const theme = {
  token: {
    colorPrimary:      '#6F762F',  // olive-600
    colorLink:         '#6F762F',  // olive-600
    colorLinkHover:    '#5A6126',  // olive-700
    colorSuccess:      '#3B6D11',
    colorWarning:      '#854F0B',
    colorError:        '#A32D2D',
    colorInfo:         '#185FA5',

    colorText:           '#2C2E22',
    colorTextSecondary:  '#5F614E',
    colorTextTertiary:   '#8A8B7C',
    colorBgBase:         '#FFFFFF',
    colorBgLayout:       '#F7F7F4',
    colorBorder:         '#E6E6DD',
    colorBorderSecondary:'#EFEFE8',

    borderRadius: 8,
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    boxShadow:          '0 2px 8px rgba(44,46,34,0.08)',
    boxShadowSecondary: '0 8px 24px rgba(44,46,34,0.10)',
  },
};
```

### 7.2 Komponent tokenlari (`components`)

```ts
components: {
  Layout: {
    siderBg:   '#FBF9E8',   // cream-100
    headerBg:  '#FBF9E8',
    bodyBg:    '#F7F7F4',
    headerHeight: 56,
  },
  Menu: {
    itemBg:            'transparent',
    itemSelectedBg:    '#5A6126',  // olive-700 (oq matn AA dan o'tadi)
    itemSelectedColor: '#FFFFFF',
    itemHoverBg:       '#F6F7EA',  // olive-50
    itemColor:         '#454B1C',  // olive-800
    itemBorderRadius:  8,
  },
  Button: {
    primaryShadow: 'none',
    fontWeight: 500,
    controlHeight: 36,
  },
  Table: {
    headerBg:         '#FBF9E8',  // cream-100
    headerColor:      '#454B1C',  // olive-800
    rowHoverBg:       '#F6F7EA',  // olive-50
    rowSelectedBg:    '#E7EBC4',  // olive-100
    borderColor:      '#E6E6DD',
    cellPaddingBlock: 12,
  },
  Input:  { controlHeight: 36, activeBorderColor: '#6F762F', hoverBorderColor: '#8A9340' },
  Select: { controlHeight: 36 },
  Card:   { borderRadiusLG: 12 },
  Tag:    { defaultBg: '#E7EBC4', defaultColor: '#454B1C' },
}
```

> AntD v6 token nomi v5 dan farq qilsa, v6 nomини ishlat; bu fayl — sozlash uchun yagona joy.

---

## 8. Tailwind CSS v4 + Ant Design

Layout, bo'shliq va o'z komponentlarимиз uchun **Tailwind CSS v4** (eng so'nggi), boy widgetlar uchun esa Ant Design ishlatamiz. Tailwind v4 — CSS-first: CSS ichida `@theme` orqali sozlanadi, maxsus Vite plagini (`@tailwindcss/vite`) orqali o'rnatiladi — `tailwind.config.js` ham, PostCSS bosqichi ham kerak emas.

### 8.1 Bitta palitra, yagona manba

Zaytun/krem palitra **bir marta** belgilanadi va ikkala tizim ham undan foydalanadi — nomuvofiqlik (drift) bo'lmaydi:

- `src/app/tokens.ts` — palitra TS obyekt sifatida, asosiy manba (authority). **AntD haqiqiy hex talab qiladi** (hover/active soyalarni rang matematikasi bilan hisoblaydi, buni `var()` ustida qila olmaydi), shuning uchun `theme.ts` shu hex qiymatlarni import qiladi.
- `src/index.css` — Tailwind `@theme` bloki xuddi shu hexни Tailwind rang tokenlari sifatida aks ettiradi (`--color-olive-600`, `--color-cream-100`, …), bu `bg-olive-600`, `text-olive-800` kabi utility'larni hosil qiladi.

```css
@import "tailwindcss";

@theme {
  --color-olive-50:  #F6F7EA;
  --color-olive-100: #E7EBC4;
  --color-olive-400: #A8B04A;
  --color-olive-600: #6F762F;
  --color-olive-700: #5A6126;
  --color-olive-800: #454B1C;
  --color-cream-100: #FBF9E8;
  --color-cream-200: #F5F1CF;
  --color-ink:       #2C2E22;
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-serif: "Cormorant Garamond", Georgia, serif;
  --radius-md: 8px;
}
```

> Qiymat o'zgarsa, uni `tokens.ts` va `@theme` blokида birga o'zgartiring (ikkalasида bir xil hex). `tokens.ts` — manba; `@theme` bloki uni aks ettiradi.

### 8.2 `@apply` qoidalari (Tailwind v4)

- CSS yozishдан ko'ra **markup'да utility** (`className="flex gap-4 …"`) afzal.
- Custom class haqiqatan kerak bo'lganда (takrorlanuvchi pattern), uni CSS faylда `@apply` bilan qur.
- **v4 nuansи:** `@import "tailwindcss"` bo'lган faylдан *boshqa* har qanday CSS faylда, eng tepaga `@reference "../index.css";` qo'shishing shart — aks holda `@apply` mavzuni (theme) ko'rmaydi va build yiqiladi.

```css
@reference "../index.css";

.stat-card {
  @apply rounded-md border border-[--color-border] bg-white px-4 py-3;
}
```

### 8.3 Ant Design'ni styling qilish — afzallik tartibi

1. **Avval design token** — AntD ko'rinishини `theme.ts` (§7) orqali o'zgartir. Bu mustahkam yo'l va ~90% holatни qoplaydi.
2. **AntD komponentiga `className` orqali Tailwind utility** — to'liq qo'llanadi va xavfsiz: `<Button className="mt-4 w-full">`, `<Card className="shadow-none">`.
3. **AntD ichki `.ant-*` selektorlarини `@apply` bilan override qilish** — faqat oxirgi chora. `.ant-*` nomlar AntD ichki detali, versiya orasida o'zgarishi mumkin, va AntD CSS-in-JS specificity urushi keltiradi. Iloji bo'lmasa, scope qil va `!important`дан ko'ra cascade layer'ga tayan (keyingi nuqta).

### 8.4 Cascade layer (konfliktдан qochish)

Ikkita haqiqiy konflikt va yechimi:

- **Tailwind Preflight vs AntD reset:** Tailwind asosiy reseti AntD komponent stillarини buzishi mumkin (masalan tugma chegaralari). Yechim — cascade-layer tartibini boshqarish, toki AntD stillari kerakли joyда g'olib chiqsin.
- **Override specificity:** ilovani `StyleProvider` (`@ant-design/cssinjs` dan) bilan `layer` prop orqali o'ra — AntD stillari nomланган cascade layerда turadi; Tailwind v4 ham layer'ga chiqaradi. Tartibni bir marta belgila (masalan `@layer tailwind-base, antd, tailwind-utilities;`) — utility'lар AntD ni `!important`**siz** override qila oladi.

Bu AntD theming'ни token asosida, Tailwind'ни esa layout/utility qatlami sifatida, oldindan aytsa bo'ladigan cascade bilan saqlaydi.

---

## 9. Logo va ikonografiya

- **Wordmark** "LIMONÉ" `font-serif`да, rang `olive-600`; tagline "APPAREL" harf oralig'i ochilgan sans, `olive-700`. Sidebar header va login ekranида ishlatiladi.
- UI ning qolganini serifда **yozma** — serif faqat wordmark va login hero uchun.
- Ikonalar: bitta outline ikona to'plami (Ant Design Icons yoki Tabler), stroke uslub, standart `text-secondary`, faolда `olive-600`.
- Logoни **SVG** sifatida ber (har o'lchamда aniq). Atrofида cap balandligiga teng bo'sh joy qoldir.

---

## 10. Accessibility qoidalari

- §3 dagi tekshirilgan kontrastlarni saqla. Hech qachon `olive-400` ustiga matn qo'yma.
- Status uchun faqat rangga tayanma — rangни yorliq yoki ikona bilan birga ber (masalan "Kam" + sariq chip).
- Har bir interaktiv elementда ko'rinadigan focus ring (§6).
- Minimal interaktiv target balandligi 36px; **worker mobil-first ekranlarida** (`FRONTEND_ARCHITECTURE.md` §11.1 ga qarang) target ≥ 44px.
- Asosiy matn 12px dan past emas; `text-tertiary` faqat hint/placeholder uchun.

---

## 11. Fayl joylashuvi (frontend)

```
apps/admin/src/
  app/
    tokens.ts           # palitra TS obyekt sifatida (manba; AntD haqiqiy hex talab qiladi)
    theme.ts            # AntD ConfigProvider tokenlari — tokens.ts dan import qiladi
  index.css             # @import "tailwindcss" + @theme bloki (tokens.ts ni aks ettiradi)
```

- `tokens.ts` — palitra uchun yagona manba.
- `theme.ts` shu hex qiymatlarni AntD uchun import qiladi.
- `index.css` dagi `@theme` bloki xuddi shu hexни aks ettiradi, Tailwind tokenlarини ochadi (`--color-olive-600`, …) → utility'lar (`bg-olive-600`, `text-ink`).
- `@apply` ishlatadigan komponent CSS fayllari `@reference "../index.css";` bilan boshlanadi.

---

## 12. Keyingi qadam

`apps/admin` skeletini qurganda shu tokenlarni ishlat: `app/tokens.ts` + `app/theme.ts` + `index.css` (`@import "tailwindcss"` + `@theme`) yarat, Tailwind v4 ni `@tailwindcss/vite` orqali o'rnat, ilovani `ConfigProvider theme={theme}` (va layer'li `StyleProvider`) bilan o'ra, so'ng Faza 0 ekranlarini (login, dashboard skeleti, users) shu tizim ustida qur.
