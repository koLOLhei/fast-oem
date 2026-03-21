-- factory_note: admin-authored note shared with factory portal
-- Separate from admin_notes (internal only) so factories only see what admin explicitly shares
ALTER TABLE orders ADD COLUMN IF NOT EXISTS factory_note TEXT DEFAULT '';
