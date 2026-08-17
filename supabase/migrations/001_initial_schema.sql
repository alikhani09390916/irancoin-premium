-- ============================================
-- IRANCOiN Database Schema
-- Execute in: https://supabase.com/dashboard/project/ibnpgzmbepieudwalwtv/sql/new
-- ============================================

-- PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,           -- 'monthly', 'quarterly', 'semiannual', 'annual'
  name TEXT NOT NULL,            -- 'پلن ماهانه'
  price_usd NUMERIC(10,2) NOT NULL,
  price_toman NUMERIC(15,0),
  duration_days INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
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
CREATE TABLE IF NOT EXISTS payments (
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

-- CARD PAYMENTS ( receipts )
CREATE TABLE IF NOT EXISTS card_payments (
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

-- CONTENT TABLE (for admin content management)
CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY,           -- 'hero_title', 'testimonials', etc.
  content JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- VERSION HISTORY TABLE
CREATE TABLE IF NOT EXISTS version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_card_payments_status ON card_payments(status);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_history ENABLE ROW LEVEL SECURITY;

-- Plans: public read, admin write
CREATE POLICY "Plans are viewable by everyone" ON plans FOR SELECT USING (true);

-- Subscriptions: users can see their own
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Payments: users can see their own
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);

-- Card payments: users can see their own
CREATE POLICY "Users can view own card payments" ON card_payments FOR SELECT USING (auth.uid() = user_id);

-- Site content: public read
CREATE POLICY "Content is viewable by everyone" ON site_content FOR SELECT USING (true);

-- Version history: authenticated read
CREATE POLICY "Authenticated can view versions" ON version_history FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- SEED DATA: Default Plans
-- ============================================
INSERT INTO plans (id, name, price_usd, duration_days, features) VALUES
  ('monthly', 'پلن ماهانه', 29.00, 30, '["دسترسی کامل به تحلیل‌ها", "سیگنال‌های لحظه‌ای", "پشتیبانی ۲۴/۷"]'::jsonb),
  ('quarterly', 'پلن فصلی', 79.00, 90, '["دسترسی کامل به تحلیل‌ها", "سیگنال‌های لحظه‌ای", "پشتیبانی ۲۴/۷", "گزارش‌های هفتگی"]'::jsonb),
  ('semiannual', 'پلن شش‌ماهه', 149.00, 180, '["دسترسی کامل به تحلیل‌ها", "سیگنال‌های لحظه‌ای", "پشتیبانی ۲۴/۷", "گزارش‌های هفتگی", "مشاوره اختصاصی"]'::jsonb),
  ('annual', 'پلن سالانه', 249.00, 365, '["دسترسی کامل به تحلیل‌ها", "سیگنال‌های لحظه‌ای", "پشتیبانی ۲۴/۷", "گزارش‌های هفتگی", "مشاوره اختصاصی", "۳ ماه رایگان"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
