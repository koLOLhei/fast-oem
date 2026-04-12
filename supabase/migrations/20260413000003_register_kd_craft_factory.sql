-- ============================================================
-- 2026-04-13: Register KD Craft factory and assign to all active products
-- ============================================================

-- 1. Insert factory
INSERT INTO public.factories (name, country, contact_email, contact_name, is_active)
VALUES (
  'Zhongshan Kd Craft Limited',
  'CN',
  'sales22@kd-craft.cn',
  'Sabina Li',
  TRUE
)
ON CONFLICT DO NOTHING;

-- 2. Set as default factory for all 4 active products
UPDATE public.products
SET default_factory_id = (
  SELECT id FROM public.factories WHERE contact_email = 'sales22@kd-craft.cn' LIMIT 1
)
WHERE slug IN ('acrylic-keychain', 'can-badge', 'pin-badge', 'rubber-keychain');
