-- IRAN COIN — Supabase Schema
-- Users, Subscriptions, Payments

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ SUBSCRIPTION PLANS ============
CREATE TABLE plans (
  id            TEXT PRIMARY KEY,                -- '1m', '3m', '6m', '1yr'
  label         TEXT NOT NULL,                   -- '۱ ماهه', '۳ ماهه', ...
  duration_days INTEGER NOT NULL,                -- 30, 90, 180, 365
  price_usdt    NUMERIC(10,2) NOT NULL,          -- 29.00, 79.00, ...
  features      JSONB DEFAULT '[]'::jsonb,
  is_popular    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed plans
INSERT INTO plans (id, label, duration_days, price_usdt, is_popular) VALUES
  ('1m',  '۱ ماهه',   30,  29.00, FALSE),
  ('3m',  '۳ ماهه',   90,  79.00, FALSE),
  ('6m',  '۶ ماهه',  180, 149.00, TRUE),
  ('1yr', '۱ ساله',  365, 249.00, FALSE);

-- ============ SUBSCRIPTIONS ============
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id         TEXT NOT NULL REFERENCES plans(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','expired','cancelled')),
  started_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  auto_renew      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sub_user ON subscriptions(user_id);
CREATE INDEX idx_sub_status ON subscriptions(status);

-- ============ PAYMENTS ============
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  plan_id         TEXT NOT NULL REFERENCES plans(id),
  amount_usdt     NUMERIC(10,2) NOT NULL,
  currency        TEXT DEFAULT 'USDT',
  network         TEXT DEFAULT 'TRC20',
  invoice_id      BIGINT UNIQUE,                 -- NOWPayments invoice ID
  payment_status  TEXT DEFAULT 'waiting'
                    CHECK (payment_status IN ('waiting','confirming','confirmed','failed','refunded','expired')),
  pay_address     TEXT,                          -- crypto address to pay
  pay_amount      NUMERIC(18,8),                 -- amount in crypto
  tx_hash         TEXT,                          -- blockchain transaction hash
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pay_user ON payments(user_id);
CREATE INDEX idx_pay_invoice ON payments(invoice_id);
CREATE INDEX idx_pay_status ON payments(payment_status);

-- ============ USER PROFILES ============
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ RLS POLICIES ============
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Subscriptions: users can read their own
CREATE POLICY "Users read own subscriptions"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Payments: users can read their own
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT USING (auth.uid() = user_id);

-- ============ HELPER FUNCTIONS ============

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = uid
      AND status = 'active'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's active subscription
CREATE OR REPLACE FUNCTION get_active_subscription(uid UUID)
RETURNS TABLE (
  plan_id TEXT,
  expires_at TIMESTAMPTZ,
  days_left INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.plan_id, s.expires_at,
         EXTRACT(DAY FROM s.expires_at - NOW())::INTEGER
  FROM subscriptions s
  WHERE s.user_id = uid
    AND s.status = 'active'
    AND s.expires_at > NOW()
  ORDER BY s.expires_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
