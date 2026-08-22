-- IRANCOiN — Add email_logs table + admin views

CREATE TABLE IF NOT EXISTS email_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email        TEXT NOT NULL,
  template        TEXT NOT NULL,
  subject         TEXT NOT NULL,
  status          TEXT DEFAULT 'sent' CHECK (status IN ('sent','failed','bounced')),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_to ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_template ON email_logs(template);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Admin stats view
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  (SELECT COUNT(*) FROM auth.users)::INTEGER as total_users,
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active')::INTEGER as active_subscriptions,
  (SELECT COUNT(*) FROM payments WHERE payment_status = 'confirmed')::INTEGER as confirmed_payments,
  (SELECT COALESCE(SUM(amount_usdt), 0) FROM payments WHERE payment_status = 'confirmed')::NUMERIC as total_revenue,
  (SELECT COUNT(*) FROM payments WHERE payment_status = 'waiting')::INTEGER as pending_payments,
  (SELECT COUNT(*) FROM email_logs)::INTEGER as emails_sent;
