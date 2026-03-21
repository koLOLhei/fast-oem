-- Performance indexes for 100+ orders/day scale
-- Applied 2026-03-21

-- Generated columns for efficient text search
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_email text
    GENERATED ALWAYS AS (customer_info->>'email') STORED;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name text
    GENERATED ALWAYS AS (
      COALESCE(
        NULLIF(TRIM(customer_info->>'name'), ''),
        NULLIF(TRIM(COALESCE(customer_info->>'lastName','') || ' ' || COALESCE(customer_info->>'firstName','')), '')
      )
    ) STORED;

-- Orders: frequent filter/sort patterns
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
  ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id
  ON public.orders (payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_email
  ON public.orders (lower(customer_email))
  WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_order_number
  ON public.orders (lower(order_number))
  WHERE order_number IS NOT NULL;

-- Email dedup check (WHERE IS NULL fast path)
CREATE INDEX IF NOT EXISTS idx_orders_email_not_sent
  ON public.orders (id)
  WHERE confirmation_email_sent_at IS NULL;

-- Order items: parent join + factory queries
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_factory_id
  ON public.order_items (factory_id)
  WHERE factory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_status
  ON public.order_items (status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id_status
  ON public.order_items (order_id, status);

-- Stuck items query: items without converted design, created recently
CREATE INDEX IF NOT EXISTS idx_order_items_stuck
  ON public.order_items (created_at)
  WHERE converted_design_url IS NULL;
