ALTER TABLE factories 
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS max_capacity integer,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
