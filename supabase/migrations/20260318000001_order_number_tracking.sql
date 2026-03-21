-- Human-readable order number (e.g. FO-M0J3KX2T-A1B2C3)
-- Populated from Stripe checkout metadata at webhook time
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_number text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx
    ON public.orders (order_number)
    WHERE order_number IS NOT NULL;

-- Carrier tracking number — entered by factory when shipping
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS tracking_number text;
