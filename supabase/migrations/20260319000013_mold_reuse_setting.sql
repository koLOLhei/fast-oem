-- Mold reuse expiration: configurable via admin settings page.
-- Default is 12 months. Set to 0 to disable expiration entirely.
INSERT INTO public.site_settings (key, label, value)
VALUES ('mold_reuse_months', '型再利用有効期限（ヶ月、0=無期限）', '12')
ON CONFLICT (key) DO NOTHING;
