# راه‌اندازی IRANCOiN — واقعی‌سازی

## پیش‌نیازها
- [x] اکانت Supabase
- [x] NOWPayments API Key + Public Key
- [ ] NOWPayments IPN Secret (از پنل NOWPayments → Settings → IPN Secret)

## مرحله ۱: دیتابیس Supabase

### ۱.۱ جدول‌ها رو بساز
1. به پنل Supabase برو → پروژه‌ات → SQL Editor
2. محتوای فایل `supabase/migrations/001_initial_schema.sql` رو paste کن
3. Run کن

### ۱.۲ RLS فعال کن
Table Editor → هر جدول → Authentication → Enable RLS

## مرحله ۲: Edge Functions

### ۲.۱ Supabase CLI نصب کن
```bash
npm install -g supabase
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```

### ۲.۲ متغیرهای محیطی رو تنظیم کن
```bash
supabase secrets set NOWPAYMENTS_API_KEY=your_api_key
supabase secrets set NOWPAYMENTS_PUBLIC_KEY=your_public_key
supabase secrets set NOWPAYMENTS_IPN_SECRET=your_ipn_secret
supabase secrets set SITE_URL=https://your-domain.com
```

### ۲.۳ Edge Functions رو deploy کن
```bash
supabase functions deploy create-invoice
supabase functions deploy ipn-webhook
supabase functions deploy check-subscription
```

## مرحله ۳: NOWPayments IPN

1. به پنل NOWPayments برو → Settings → IPN
2. Callback URL رو تنظیم کن:
   ```
   https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/ipn-webhook
   ```
3. IPN Secret رو کپی کن و به Supabase secrets اضافه کن

## مرحله ۴: فرانت‌اند

### ۴.۱ Supabase Client رو تنظیم کن
در فایل `js/supabase.js`:
```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### ۴.۲ API Endpoint ها
- ایجاد فاکتور: `POST /.netlify/functions/create-invoice`
- بررسی اشتراک: `GET /.netlify/functions/check-subscription`
- Webhook: `POST /.netlify/functions/ipn-webhook`

## مرحله ۵: تست

### ۵.۱ تست Local
```bash
supabase functions serve --env-file .env.local
```

### ۵.۲ تست NOWPayments
1. فاکتور آزمایشی بساز
2. پرداخت کن (می‌تونی از testnet استفاده کنی)
3. بررسی کن که webhook دریافت بشه
4. اشتراک فعال بشه

## ساختار دیتابیس

```
plans
├── id (TEXT PK)
├── label (TEXT)
├── duration_days (INTEGER)
├── price_usdt (NUMERIC)
├── features (JSONB)
└── is_popular (BOOLEAN)

subscriptions
├── id (UUID PK)
├── user_id (UUID FK → auth.users)
├── plan_id (TEXT FK → plans)
├── status (TEXT)
├── started_at (TIMESTAMPTZ)
├── expires_at (TIMESTAMPTZ)
└── auto_renew (BOOLEAN)

payments
├── id (UUID PK)
├── user_id (UUID FK → auth.users)
├── subscription_id (UUID FK → subscriptions)
├── plan_id (TEXT FK → plans)
├── amount_usdt (NUMERIC)
├── invoice_id (BIGINT)
├── payment_status (TEXT)
├── pay_address (TEXT)
├── pay_amount (NUMERIC)
└── tx_hash (TEXT)

profiles
├── id (UUID PK → auth.users)
├── full_name (TEXT)
├── phone (TEXT)
└── avatar_url (TEXT)
```

## قیمت‌ها

| پلن | قیمت (USDT) | مدت |
|------|-------------|------|
| ۱ ماهه | ۲۹ دلار | ۳۰ روز |
| ۳ ماهه | ۷۹ دلار | ۹۰ روز |
| ۶ ماهه | ۱۴۹ دلار | ۱۸۰ روز |
| ۱ ساله | ۲۴۹ دلار | ۳۶۵ روز |

## امنیت
- RLS فعال روی همه جداول
- کاربران فقط داده‌های خودشون رو می‌بینن
- NOWPayments signature verification
- Service Role Key فقط در Edge Functions
- JWT validation روی همه درخواست‌ها
