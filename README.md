# IRANCOiN — Premium AI Fintech Experience

پروژه مستقل (جدا از irancoin-saas) — اجرای Master Prompt V2 مطابق `1.md` به‌صورت Design-as-Code تحت ساختار فیگما.

## صفحات

| صفحه | مسیر | توضیح |
|---|---|---|
| لندینگ | `index.html` | هیرو سینمایی + ۱۷ سکشن (هوش AI، موتور، ربات، ریسک، داشبورد، ژورنال، امنیت، عملکرد، صرافی‌ها، اعتماد، CTA) |
| اشتراک/پرداخت | `pricing.html` | پلن‌ها، تگیل ماهانه/سالیانه، مقایسه، ضمانت، FAQ، پنل پرداخت امن |
| داشبورد | `dashboard.html` | پیش‌نمایش پورتفولیو، پوزیشن‌ها، سیگنال‌های AI، ریسک، ژورنال |

## اجرا

```bash
python3 -m http.server 8899   # از ریشه پروژه
# → http://localhost:8899
```

بدون باندلر/فریم‌ورک — HTML/CSS/JS خالص، RTL فارسی، فونت Vazirmatn از Google Fonts.

## ساختار

```
design/tokens.css      ← منبع واحد توکن‌ها (۶۴+ رنگ، تایپ، موشن) — معادل صفحات فیگما 01-04
design/base.css        ← بیس RTL و تایپوگرافی
design/components.css  ← کامپوننت‌ها (معادل صفحه فیگما 05)
design/hero.css        ← صحنه هیرو: مغز AI (SVG)، سکه‌ها، کارت‌های شناور (صفحه 06-07)
design/sections.css    ← استایل سکشن‌ها + reveal ها
design/responsive.css  ← موبایل/تبلت/لپ‌تاپ/دسکتاپ/اولترا
js/particles.js        ← ذرات و جریان داده
js/charts.js           ← چارت شمعی/اسپارک/گِیج SVG
js/scroll.js           ← اسکرول سینمایی، پارالاکس، reveal
js/counters.js         ← شمارنده‌های آماری
js/main.js             ← ناو، منو، FAQ، تگیل، ترنزیشن صفحه، پرداخت
FIGMA-MASTER-PLAN.md   ← نقشه کامل ساخت فایل فیگما (سکشن ۳۷)
```

## نکات

- فیگما: توکن معتبر است اما REST API فقط خواندنی است؛ نقشه ساخت فایل در `FIGMA-MASTER-PLAN.md`.
- تمام آمار/قیمت/نظرات/صرافی‌ها **نمایشی** هستند (قانون صداقت).
- `prefers-reduced-motion` در همه جا پشتیبانی می‌شود.