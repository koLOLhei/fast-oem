-- Unify the die-cut cut-line width option across all three die-cut products
-- (acrylic keychain, pin badge, rubber keychain).
--
-- Kept as id='white_border' to avoid breaking existing order_items.options
-- JSONB references. Display name and values are refreshed to the new schema:
--   none / thin (0.5mm) / normal (1mm) / thick (2mm) / extra (3mm)
-- and gated on shape='die-cut' via parentId + showWhen.
--
-- Strategy: remove any existing white_border entry (jsonb_path_query minus),
-- then append the unified entry.

with unified_option as (
  select jsonb_build_object(
    'id', 'white_border',
    'name', 'カットライン幅（白フチ）',
    'type', 'list',
    'required', false,
    'description', '型抜きの外周に沿って残す白フチの幅。デザインぎりぎりでカットするか、フチを残すかを選べます。',
    'parentId', 'shape',
    'showWhen', jsonb_build_array('die-cut'),
    'values', jsonb_build_array(
      jsonb_build_object('id', 'none',   'label', 'なし（デザインぴったり）'),
      jsonb_build_object('id', 'thin',   'label', '0.5mm',
        'priceModifier', jsonb_build_object('type', 'add', 'value', 5)),
      jsonb_build_object('id', 'normal', 'label', '1mm（推奨）',
        'priceModifier', jsonb_build_object('type', 'add', 'value', 8)),
      jsonb_build_object('id', 'thick',  'label', '2mm',
        'priceModifier', jsonb_build_object('type', 'add', 'value', 12)),
      jsonb_build_object('id', 'extra',  'label', '3mm',
        'priceModifier', jsonb_build_object('type', 'add', 'value', 16))
    )
  ) as opt
),
filtered as (
  select p.id,
         coalesce(
           jsonb_agg(o.value) filter (where o.value->>'id' <> 'white_border'),
           '[]'::jsonb
         ) as opts_without_white_border
    from products p
    left join lateral jsonb_array_elements(p.options) o on true
   where p.slug in ('acrylic-keychain', 'pin-badge', 'rubber-keychain')
   group by p.id
)
update products p
   set options = f.opts_without_white_border || jsonb_build_array((select opt from unified_option))
  from filtered f
 where p.id = f.id;
