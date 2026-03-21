-- Backfill email column in profiles for users created before the
-- handle_new_user trigger was updated to save email (migration 20260319000008).
-- This is a one-time fix; the trigger handles all new signups correctly.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL
  AND u.email IS NOT NULL;
