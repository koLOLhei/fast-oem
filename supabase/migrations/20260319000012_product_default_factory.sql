-- Add default factory assignment per product.
-- When an order is placed, order_items for this product are automatically
-- assigned to this factory (status = 'assigned') instead of staying 'unassigned'.
-- Admins can always override the assignment from the order detail page.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS default_factory_id UUID
    REFERENCES public.factories(id)
    ON DELETE SET NULL;
