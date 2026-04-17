-- Add a proper FK from orders to auth.users so mypage can JOIN on user_id
-- instead of matching customer_info->>email (which an attacker can spoof at
-- guest checkout by typing any email address).
--
-- Backfill strategy: for existing rows, set user_id by email-match against
-- auth.users. Rows with no matching auth user remain NULL (guest orders).

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);

-- Backfill from auth.users where the email matches customer_info->>email.
-- Only runs once because subsequent runs find user_id already set.
UPDATE orders
SET user_id = u.id
FROM auth.users u
WHERE orders.user_id IS NULL
  AND lower(u.email) = lower(orders.customer_info->>'email');
