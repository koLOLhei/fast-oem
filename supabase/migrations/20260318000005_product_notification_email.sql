-- Add per-product notification email for factory order dispatch
ALTER TABLE products
ADD COLUMN IF NOT EXISTS notification_email TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN products.notification_email IS '工場への発注メール送付先。未設定ならシステムデフォルト宛に送信。';
