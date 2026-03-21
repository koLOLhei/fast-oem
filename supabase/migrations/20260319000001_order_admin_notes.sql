-- Add admin_notes column to orders for internal memo functionality
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';
