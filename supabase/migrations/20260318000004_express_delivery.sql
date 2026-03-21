-- Add express delivery fee option to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS express_delivery_fee integer DEFAULT 0;

-- Add express delivery tracking to order items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS express_delivery boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS express_delivery_fee integer DEFAULT 0;

-- Update existing product seed data with express delivery fees
UPDATE public.products SET express_delivery_fee = 3000 WHERE slug = 'acrylic-keychain';
UPDATE public.products SET express_delivery_fee = 3000 WHERE slug = 'can-badge';
UPDATE public.products SET express_delivery_fee = 5000 WHERE slug = 'pin-badge';
UPDATE public.products SET express_delivery_fee = 5000 WHERE slug = 'rubber-keychain';
UPDATE public.products SET express_delivery_fee = 10000 WHERE slug = 'plastic-bag';

COMMENT ON COLUMN public.products.express_delivery_fee IS '特急納期オプションの追加料金（0=特急不可）';
COMMENT ON COLUMN public.order_items.express_delivery IS '特急納期が選択されたか';
COMMENT ON COLUMN public.order_items.express_delivery_fee IS '特急料金（円）';
