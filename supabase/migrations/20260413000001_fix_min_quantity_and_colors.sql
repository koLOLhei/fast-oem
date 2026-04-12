-- ============================================================
-- 2026-04-13: Fix min_quantity mismatch + add missing background_color option
-- ============================================================

-- 1. Fix min_quantity to match first price tier
UPDATE public.products SET min_quantity = 50 WHERE slug = 'acrylic-keychain';
UPDATE public.products SET min_quantity = 100 WHERE slug = 'can-badge';
UPDATE public.products SET min_quantity = 50 WHERE slug = 'pin-badge';
UPDATE public.products SET min_quantity = 50 WHERE slug = 'rubber-keychain';

-- 2. Add background_color option to can-badge (insert at index 0, before pp_bag)
UPDATE public.products
SET options = (
  SELECT jsonb_build_array(
    '{"id":"background_color","name":"背景色","type":"color","required":false,"values":[]}'::jsonb
  ) || options
)
WHERE slug = 'can-badge';

-- 3. Add background_color option to pin-badge (insert at index 1, after resin_coating, before pp_bag)
UPDATE public.products
SET options = (
  SELECT jsonb_build_array(options->0) ||
         jsonb_build_array('{"id":"background_color","name":"背景色","type":"color","required":false,"values":[]}'::jsonb) ||
         jsonb_build_array(options->1)
)
WHERE slug = 'pin-badge';

-- 4. Add background_color option to rubber-keychain (insert at index 2, after chain_type+size, before pp_bag)
UPDATE public.products
SET options = (
  SELECT jsonb_build_array(options->0, options->1) ||
         jsonb_build_array('{"id":"background_color","name":"背景色","type":"color","required":false,"values":[]}'::jsonb) ||
         jsonb_build_array(options->2)
)
WHERE slug = 'rubber-keychain';
