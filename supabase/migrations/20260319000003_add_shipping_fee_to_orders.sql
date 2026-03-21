ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_fee integer DEFAULT 0;

COMMENT ON COLUMN public.orders.shipping_fee IS '送料（離島・沖縄など）';
