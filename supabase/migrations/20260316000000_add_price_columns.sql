-- Add price-related columns to order_items table
ALTER TABLE public.order_items
ADD COLUMN total_price integer,
ADD COLUMN mold_fee integer DEFAULT 0,
ADD COLUMN mold_order_id text,
ADD COLUMN status text DEFAULT 'unassigned';

-- Add comment for clarity
COMMENT ON COLUMN public.order_items.mold_fee IS '型代（初回のみ発生）';
COMMENT ON COLUMN public.order_items.mold_order_id IS '型再利用時の過去注文ID';
COMMENT ON COLUMN public.order_items.total_price IS '商品小計（単価 × 数量、型代は別）';
