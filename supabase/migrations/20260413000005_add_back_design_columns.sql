-- ============================================================
-- 2026-04-13: Add back design columns to order_items
--
-- For double-sided products (e.g., acrylic keychains with both-side printing),
-- the customer uploads a separate back design. These columns store that data
-- so it's not silently lost at order creation.
-- ============================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS back_design_url       text,
  ADD COLUMN IF NOT EXISTS back_design_file_name text,
  ADD COLUMN IF NOT EXISTS back_delivery_pdf_url text;

COMMENT ON COLUMN public.order_items.back_design_url       IS 'Storage path for back design image (double-sided products)';
COMMENT ON COLUMN public.order_items.back_design_file_name IS 'Original file name of back design upload';
COMMENT ON COLUMN public.order_items.back_delivery_pdf_url IS 'Delivery PDF URL for back design';
