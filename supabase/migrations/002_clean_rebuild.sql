-- IRANCOiN: Drop and recreate all tables
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ibnpgzmbepieudwalwtv/sql/new

-- Drop policies first
DO $$ BEGIN
  DROP POLICY IF EXISTS "Plans are viewable by everyone" ON plans;
  DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Users can view own payments" ON payments;
  DROP POLICY IF EXISTS "Users can view own card payments" ON card_payments;
  DROP POLICY IF EXISTS "Content is viewable by everyone" ON site_content;
  DROP POLICY IF EXISTS "Authenticated can view versions" ON version_history;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop tables
DROP TABLE IF EXISTS version_history CASCADE;
DROP TABLE IF EXISTS site_content CASCADE;
DROP TABLE IF EXISTS card_payments CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;

-- PLANS TABLE
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL,
  price_toman NUMERIC(15,0),
  duration_days INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SUBSCRIPTIONS TABLE
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
  payment_method TEXT CHECK (payment_method IN ('crypto','card')),
  payment_id TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PAYMENTS TABLE
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_id TEXT REFERENCES plans(id),
  amount_usd NUMERIC(10,2),
  amount_toman NUMERIC(15,0),
  payment_method TEXT CHECK (payment_method IN ('crypto','card')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  nowpayments_id TEXT,
  card_number TEXT,
  card_holder TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CARD PAYMENTS TABLE
CREATE TABLE card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id TEXT REFERENCES plans(id),
  card_number TEXT NOT NULL,
  card_holder TEXT NOT NULL,
  amount_toman NUMERIC(15,0) NOT NULL,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SITE CONTENT TABLE
CREATE TABLE site_content (
  id TEXT PRIMARY KEY,
  content JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- VERSION HISTORY TABLE
CREATE TABLE version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_card_payments_status ON card_payments(status);

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone" ON plans FOR SELECT USING (true);
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own card payments" ON card_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Content is viewable by everyone" ON site_content FOR SELECT USING (true);
CREATE POLICY "Authenticated can view versions" ON version_history FOR SELECT USING (auth.role() = 'authenticated');

-- SEED DATA
INSERT INTO plans (id, name, price_usd, duration_days, features) VALUES
  ('monthly', 'پلن ماهانه', 29.00, 30, '["دسترسی کامل به تحلیل‌ها", "سیگنال‌های لحظه‌ای", "پشتیبانی ۲۴/۷"]'::jsonb),
  ('quarterly', 'پلن فصلی', 79.00, 90, '["دسترسی کامل به تحلیل‌ها", "سیگنال‌های لحظه‌ای", "پشتیبانی ۲۴/۷", "گزارش‌های هفتگی"]'::jsonb),
  ('semiannual', 'پلن شش‌ماهه', 149.00, 180, '["دسترسی کامل به تحلیل‌ها", "سیگنال‌های لحظه‌ای", "پشتیبانی ۲۴/۷", "گزارش‌های هفتگی", "مشاوره اختصاصی"]'::jsonb),
  ('annual', 'پلن سالانه', 249.00, 365, '["دسترسی کامل به تحلیل‌ها", "سیگنال‌های لحظه‌ای", "پشتیبانی ۲۴/۷", "گزارش‌های هفتگی", "مشاوره اختصاصی", "۳ ماه رایگان"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
