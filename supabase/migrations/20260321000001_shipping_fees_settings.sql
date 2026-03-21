-- Add shipping fee configuration to site_settings so admins can adjust them
-- without code changes. The mainland fee is always ¥0 (free).

INSERT INTO site_settings (key, label, value) VALUES
  ('shipping_fee_okinawa',      '送料（沖縄）円',    '1500'),
  ('shipping_fee_remote_island', '送料（離島）円',    '2000')
ON CONFLICT (key) DO NOTHING;
