-- shape オプションに square を追加、aspect_ratio オプションを新規追加。
-- acrylic-keychain / rubber-keychain / pin-badge に適用。
-- 缶バッジは丸型固定なので shape オプション自体を持たない(アプリ側で 'round' を注入)。

-- ====== acrylic-keychain ======
UPDATE products
SET options = (
    SELECT jsonb_agg(
        CASE
            WHEN opt->>'id' = 'shape' THEN
                jsonb_set(opt, '{values}', '[
                    {"id": "die-cut",      "label": "型抜き（デザインに沿った形）"},
                    {"id": "round",        "label": "丸型"},
                    {"id": "square",       "label": "四角"},
                    {"id": "rounded-rect", "label": "角丸四角"}
                ]'::jsonb)
            ELSE opt
        END
    )
    FROM jsonb_array_elements(options) AS opt
) || '[{
    "id": "aspect_ratio",
    "name": "縦横比",
    "type": "list",
    "required": false,
    "parentId": "shape",
    "showWhen": ["square", "rounded-rect"],
    "values": [
        {"id": "1:1",  "label": "1:1（正方形）"},
        {"id": "4:3",  "label": "4:3（横長）"},
        {"id": "3:4",  "label": "3:4（縦長）"},
        {"id": "16:9", "label": "16:9（ワイド横）"},
        {"id": "9:16", "label": "9:16（ワイド縦）"}
    ]
}]'::jsonb
WHERE slug = 'acrylic-keychain'
  AND NOT (options::text LIKE '%"id":"aspect_ratio"%' OR options::text LIKE '%"id": "aspect_ratio"%');

-- ====== rubber-keychain ======
UPDATE products
SET options = (
    SELECT jsonb_agg(
        CASE
            WHEN opt->>'id' = 'shape' THEN
                jsonb_set(opt, '{values}', '[
                    {"id": "die-cut",      "label": "型抜き（デザインに沿った形）"},
                    {"id": "round",        "label": "丸型"},
                    {"id": "square",       "label": "四角"},
                    {"id": "rounded-rect", "label": "角丸四角"}
                ]'::jsonb)
            ELSE opt
        END
    )
    FROM jsonb_array_elements(options) AS opt
) || '[{
    "id": "aspect_ratio",
    "name": "縦横比",
    "type": "list",
    "required": false,
    "parentId": "shape",
    "showWhen": ["square", "rounded-rect"],
    "values": [
        {"id": "1:1",  "label": "1:1（正方形）"},
        {"id": "4:3",  "label": "4:3（横長）"},
        {"id": "3:4",  "label": "3:4（縦長）"},
        {"id": "16:9", "label": "16:9（ワイド横）"},
        {"id": "9:16", "label": "9:16（ワイド縦）"}
    ]
}]'::jsonb
WHERE slug = 'rubber-keychain'
  AND NOT (options::text LIKE '%"id":"aspect_ratio"%' OR options::text LIKE '%"id": "aspect_ratio"%');

-- ====== pin-badge ======
UPDATE products
SET options = (
    SELECT jsonb_agg(
        CASE
            WHEN opt->>'id' = 'shape' THEN
                jsonb_set(opt, '{values}', '[
                    {"id": "die-cut",      "label": "型抜き（デザインに沿った形）"},
                    {"id": "round",        "label": "丸型"},
                    {"id": "square",       "label": "四角"},
                    {"id": "rounded-rect", "label": "角丸四角"},
                    {"id": "heart",        "label": "ハート型"},
                    {"id": "star",         "label": "星型"}
                ]'::jsonb)
            ELSE opt
        END
    )
    FROM jsonb_array_elements(options) AS opt
) || '[{
    "id": "aspect_ratio",
    "name": "縦横比",
    "type": "list",
    "required": false,
    "parentId": "shape",
    "showWhen": ["square", "rounded-rect"],
    "values": [
        {"id": "1:1",  "label": "1:1（正方形）"},
        {"id": "4:3",  "label": "4:3（横長）"},
        {"id": "3:4",  "label": "3:4（縦長）"},
        {"id": "16:9", "label": "16:9（ワイド横）"},
        {"id": "9:16", "label": "9:16（ワイド縦）"}
    ]
}]'::jsonb
WHERE slug = 'pin-badge'
  AND NOT (options::text LIKE '%"id":"aspect_ratio"%' OR options::text LIKE '%"id": "aspect_ratio"%');
