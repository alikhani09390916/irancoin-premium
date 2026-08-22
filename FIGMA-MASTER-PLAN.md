# IRANCOiN — FIGMA MASTER PLAN (سند مرجع طراحی)

> اجرای Master Prompt V2 (1.md) به‌صورت Design-as-Code تحت نظارت سیستم دیزاین فیگما.
> توکن فیگما (`api.figma.com/v1/me`) معتبر است، اما **REST API فیگما فقط خواندنی است** و امکان ساخت فایل `.figma` ندارد؛
> بنابراین کل سیستم به‌صورت «دیزاین-به‌عنوان-کد» با همان ساختار و زبان بصری فیگما پیاده و این سند، نقشه کامل ساخت فایل فیگما است.

## ساختار فایل فیگما (پرامپت سکشن ۳۷)

| صفحه فیگما | محتوا | معادل پیاده‌سازی |
|---|---|---|
| ۰۰ — Cover | جلد و برند IRANCOiN | `index.html` برندمارک + veil |
| 01 — Master Frame | نمای کلی سیستم (برند، رنگ، تایپ، مغز AI، سکه‌ها، چارت، کارت، موشن، اسپیسینگ) | `design/tokens.css` + این سند |
| 02 — Design Tokens | Color / Gradient / Typography / Spacing / Radius / Shadow / Blur / Border / Motion | `design/tokens.css` |
| 03 — Typography | Display XL→Caption، Financial Numbers، Data Labels، Buttons، Nav | `design/base.css` |
| 04 — Colors & Gradients | پالت ۶۴ رنگ کنترل‌شده سفید-پرمیوم | `design/tokens.css` (متغیرهای `--c-*`) |
| 05 — Components | Navbar، Buttons، Glass Cards، AI Cards، Stat Cards، Pricing، Badges، Tabs، FAQ، Inputs، Toasts، Status | `design/components.css` + `design/sections.css` |
| 06 — Motion System | Micro/UI/Card/Hero/Data/Scroll/Page/ Loading/Success/Error | `design/hero.css` + `js/*` |
| 07 — Landing Desktop | هیرو سینمایی + ۱۷ سکشن | `index.html` |
| 08 — Landing Mobile | بازآرایی هوشمند موبایل | `design/responsive.css` |
| 09 — Subscription Desktop | پلن‌ها، تگیل، مقایسه، امنیت، FAQ، پرداخت | `pricing.html` |
| 10 — Subscription Mobile | نسخه موبایل | `design/responsive.css` |
| 11 — Prototype Flows | بارگذاری، ورود سه‌جهته، ناو، CTA، اسکرول، تگیل، FAQ، ترنزیشن لندینگ→اشتراک | `js/main.js` + `js/scroll.js` |
| 12 — Assets | لوگو، بیت‌کوین، تتر، مغز AI، چارت‌ها، آیکون‌ها، گرادیان‌ها | `assets/` + SVGهای inline |

## Tokens (منبع واحد)

- ۶۴+ رنگ: بنفش/ویولت، آبی، سیان، فیروزه‌ای، زمردی، طلایی (کاملاً کنترل‌شده در `--c-*`)
- ۱۳ گرادیان (`--grad-*`): برند، هیرو، شفق، طلا، مغز، بیت‌کوین، تتر
- تایپ: Vazirmatn (فارسی RTL) + ارقام مالی جدا (`--font-num`، `direction:ltr`)
- اسپیس ۴pt، شعاع، سایه، بلور، موشن (`--dur-*`, `--ease-*`)

## Choreography بارگذاری (سکشن ۹ پرامپت)

1. `hero-bg` نور پس‌زمینه + گرادیان اتمسفر (۰.۱۵s)
2. `brain-glow`/`brain-materialize` مغز (۰.۳۵s)
3. سکه بیت‌کوین از بالا-راست، تتر از پایین-چپ (۰.۸–۱.۰s)
4. ویجت‌های چارت کوچک (۱.۳۵–۱.۵s)
5. کارت‌های شناور AI (۱.۵–۱.۹۵s)
6. تیترها از سه جهت: راست، چپ، بالا (۱.۱۵–۱.۵۵s)
7. دکمه‌های CTA (۱.۹۵s) → آمار (۲.۲–۲.۵s)

## Motion System (سکشن ۳۱)

| حرکت | پیاده‌سازی |
|---|---|
| Micro | hover/active دکمه‌ها، tooltip، status-dot pulse |
| UI | accordion، tabs، تگیل دوره، toast |
| Card | کارت‌های شناور `float-1..4` |
| Hero | `hl-from-*` سه‌جهته + مغز چرخان canvas سه‌بعدی |
| Data | رسم شمعی SVG + گِیج ریسک + counters |
| Scroll | `[data-reveal]` IntersectionObserver + پارالاکس `[data-parallax]` |
| Page Transition | `page-veil` گرادیانی (لندینگ↔اشتراک↔داشبورد) |
| Loading/Success/Error | spinner دکمه، toast، state های دکمه |

## Performance (سکشن ۳۲)

- مغز AI: canvas سبک با ~۹۰ گره (بدون WebGL) — ارتقا به Three.js برای تولید
- `prefers-reduced-motion` در تمام انیمیشن‌ها
- پارالاکس با `requestAnimationFrame` throttle
- SVG تولیده‌شده برای چارت‌ها (بدون کتابخانه خارجی)

## Accessibility (سکشن ۳۳)

- skip-link، aria-label، aria-expanded، aria-pressed، role=tab
- کنتراست بالا، focus-visible، touch targets، reduced-motion

## محدودیت‌های صادقانه

- هیچ همکاری صرافی‌ای ادعا نشده (همه «در حال بررسی — داده نمایشی»)
- قیمت‌ها و آمار نمونه هستند و برچسب «نسخه نمایشی» دارند
- برند فقط IRANCOiN / ایران کوین — بدون نماد سیاسی/پرچم