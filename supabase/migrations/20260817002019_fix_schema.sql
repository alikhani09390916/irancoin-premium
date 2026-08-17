-- IRAN COIN — Fix: Drop and recreate all tables
-- Clean slate after partial migration

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS get_active_subscription(UUID);
DROP FUNCTION IF EXISTS has_active_subscription(UUID);
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============ SUBSCRIPTION PLANS ============
CREATE TABLE plans (
  id            TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price_usdt    NUMERIC(10,2) NOT NULL,
  features      JSONB DEFAULT '[]'::jsonb,
  is_popular    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plans (id, label, duration_days, price_usdt, is_popular) VALUES
  ('1m',  '۱ ماهه',   30,  29.00, FALSE),
  ('3m',  '۳ ماهه',   90,  79.00, FALSE),
  ('6m',  '۶ ماهه',  180, 149.00, TRUE),
  ('1yr', '۱ ساله',  365, 249.00, FALSE);

-- ============ SUBSCRIPTIONS ============
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  plan_id         TEXT NOT NULL REFERENCES plans(id),
  amount_usdt     NUMERIC(10,2) NOT NULL,
  currency        TEXT DEFAULT 'USDT',
  network         TEXT DEFAULT 'TRC20',
  invoice_id      BIGINT UNIQUE,
  payment_status  TEXT DEFAULT 'waiting'
                    CHECK (payment_status IN ('waiting','confirming','confirmed','failed','refunded','expired')),
  pay_address     TEXT,
  pay_amount      NUMERIC(18,8),
  tx_hash         TEXT,
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

-- ============ RLS ============
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users read own subscriptions"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT USING (auth.uid() = user_id);

-- ============ EMAIL LOGS ============
CREATE TABLE email_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email        TEXT NOT NULL,
  template        TEXT NOT NULL,
  subject         TEXT NOT NULL,
  status          TEXT DEFAULT 'sent' CHECK (status IN ('sent','failed','bounced')),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_to ON email_logs(to_email);
CREATE INDEX idx_email_template ON email_logs(template);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- ============ ADMIN POLICIES ============
-- Admins can read all data (service_role bypasses RLS, but just in case)
CREATE POLICY "Service role full access on email_logs"
  ON email_logs FOR ALL USING (true);

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION has_active_subscription(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = uid AND status = 'active' AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_active_subscription(uid UUID)
RETURNS TABLE (plan_id TEXT, expires_at TIMESTAMPTZ, days_left INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT s.plan_id, s.expires_at,
         EXTRACT(DAY FROM s.expires_at - NOW())::INTEGER
  FROM subscriptions s
  WHERE s.user_id = uid AND s.status = 'active' AND s.expires_at > NOW()
  ORDER BY s.expires_at DESC LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
