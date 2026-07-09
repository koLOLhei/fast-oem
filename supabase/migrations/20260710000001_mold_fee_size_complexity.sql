-- Mold-fee scaling: size × complexity
-- Adds two JSONB columns to products so the base mold fee can scale with
-- selected size (larger = more material/machining) and design complexity
-- (more intricate = more tool-path time). Final fee is computed in
-- lib/products.ts via calculateMoldFee → applyMoldMultipliers, and re-verified
-- server-side against the uploaded design image in app/actions/stripe.ts.

alter table products
  add column if not exists mold_fee_size_multipliers jsonb,
  add column if not exists mold_fee_complexity_multipliers jsonb;

comment on column products.mold_fee_size_multipliers is
  'size option-value id -> multiplier applied to base mold fee. Example: {"20mm":0.65,"40mm":1.0,"80mm":2.1}.';
comment on column products.mold_fee_complexity_multipliers is
  'complexity grade (A-E) -> multiplier applied to base mold fee. Example: {"A":1.0,"C":1.25,"E":1.8}.';

-- Populate defaults for the two mold-requiring products.
-- Pin badge — metal mold, 40mm base. Larger sizes cost meaningfully more due
-- to material + machining time; complexity dominates tool-path time.
update products
set mold_fee_size_multipliers = jsonb_build_object(
      '20mm', 0.65,
      '30mm', 0.82,
      '40mm', 1.00,
      '50mm', 1.22,
      '60mm', 1.48,
      '70mm', 1.78,
      '80mm', 2.10
    ),
    mold_fee_complexity_multipliers = jsonb_build_object(
      'A', 1.00,
      'B', 1.10,
      'C', 1.25,
      'D', 1.50,
      'E', 1.80
    )
where slug = 'pin-badge';

-- Rubber keychain — 50mm base. Material cost ratio is lower than metal, so
-- size sensitivity is somewhat lower per step; complexity is the same.
update products
set mold_fee_size_multipliers = jsonb_build_object(
      '40mm', 0.75,
      '50mm', 1.00,
      '60mm', 1.28,
      '70mm', 1.58,
      '80mm', 1.92,
      '100mm', 2.65
    ),
    mold_fee_complexity_multipliers = jsonb_build_object(
      'A', 1.00,
      'B', 1.10,
      'C', 1.25,
      'D', 1.50,
      'E', 1.80
    )
where slug = 'rubber-keychain';
