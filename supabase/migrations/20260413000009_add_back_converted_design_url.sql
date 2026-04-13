-- ============================================================
-- 2026-04-13: Add back_converted_design_url to order_items
--
-- The webhook processImage() converts raw design images to optimised PNGs
-- and stores the result in converted_design_url (front side). For
-- double-sided products the back design needs an equivalent column.
-- ============================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS back_converted_design_url text;

COMMENT ON COLUMN public.order_items.back_converted_design_url
  IS 'Storage path for Sharp-processed back design PNG (double-sided products)';
