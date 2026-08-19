-- IRANCOiN — Fix email_logs RLS: the previous policy granted full access to
-- every role (anon/authenticated) via USING (true). Service role bypasses RLS
-- anyway, so the correct setup is to deny public roles explicitly.

DROP POLICY IF EXISTS "Service role full access on email_logs" ON email_logs;

CREATE POLICY "Deny public access on email_logs"
  ON email_logs FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);