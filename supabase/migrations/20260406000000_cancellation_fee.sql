-- Add cancellation_fee column to orders table for tracking fees charged on cancel
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_fee integer;
