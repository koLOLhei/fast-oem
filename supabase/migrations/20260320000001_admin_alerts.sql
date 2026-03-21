-- admin_alerts: DB fallback for critical alerts when Slack / email delivery fails.
-- Rows are written by the Edge Function when sendAdminAlert() cannot reach Slack.

CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  subject     text NOT NULL,
  body        text NOT NULL,
  source      text,            -- e.g. 'background_error', 'sendWithRetry'
  order_id    uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  slack_failed boolean NOT NULL DEFAULT false,
  resolved_at timestamptz      -- set by admin when acknowledged
);

-- Admins can read and update (mark resolved); service role can insert
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin_alerts"
ON public.admin_alerts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update admin_alerts"
ON public.admin_alerts FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Service role can insert admin_alerts"
ON public.admin_alerts FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Index for admin dashboard queries (newest first, unresolved)
CREATE INDEX IF NOT EXISTS admin_alerts_created_at_idx ON public.admin_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_alerts_unresolved_idx ON public.admin_alerts (resolved_at) WHERE resolved_at IS NULL;
