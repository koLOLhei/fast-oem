-- 全商品価格を 2026-04 市場相場調査に基づき改訂。
-- 原価割れ帯（特にアクリル/ラバーの中〜大ロット、ピンバッジ全帯）を是正。
-- あわせて size modifier を multiply 型に統一し、大ロット時も比率が破綻しないようにする。

-- ====================== acrylic-keychain ======================
-- 50mm基準。参考相場: 100個¥150-190, 1,000個¥99-165, 10,000個¥70-95, 100,000個¥50-65
UPDATE products
SET price_tiers = '[
    {"minQuantity": 50,     "maxQuantity": 100,    "unitPrice": 180},
    {"minQuantity": 101,    "maxQuantity": 200,    "unitPrice": 160, "discountPercent": 11},
    {"minQuantity": 201,    "maxQuantity": 300,    "unitPrice": 150, "discountPercent": 17},
    {"minQuantity": 301,    "maxQuantity": 500,    "unitPrice": 135, "discountPercent": 25},
    {"minQuantity": 501,    "maxQuantity": 1000,   "unitPrice": 120, "discountPercent": 33},
    {"minQuantity": 1001,   "maxQuantity": 2000,   "unitPrice": 105, "discountPercent": 42},
    {"minQuantity": 2001,   "maxQuantity": 3000,   "unitPrice": 95,  "discountPercent": 47},
    {"minQuantity": 3001,   "maxQuantity": 5000,   "unitPrice": 88,  "discountPercent": 51},
    {"minQuantity": 5001,   "maxQuantity": 10000,  "unitPrice": 82,  "discountPercent": 54},
    {"minQuantity": 10001,  "maxQuantity": 20000,  "unitPrice": 75,  "discountPercent": 58},
    {"minQuantity": 20001,  "maxQuantity": 50000,  "unitPrice": 68,  "discountPercent": 62},
    {"minQuantity": 50001,  "maxQuantity": 100000, "unitPrice": 62,  "discountPercent": 66},
    {"minQuantity": 100001, "maxQuantity": 200000, "unitPrice": 58,  "discountPercent": 68}
]'::jsonb
WHERE slug = 'acrylic-keychain';

UPDATE products
SET options = (
    SELECT jsonb_agg(
        CASE
            WHEN opt->>'id' = 'size' THEN
                jsonb_set(
                    opt,
                    '{values}',
                    '[
                        {"id": "40mm",  "label": "40mm",  "priceModifier": {"type": "multiply", "value": 0.80}},
                        {"id": "50mm",  "label": "50mm"},
                        {"id": "60mm",  "label": "60mm",  "priceModifier": {"type": "multiply", "value": 1.25}},
                        {"id": "70mm",  "label": "70mm",  "priceModifier": {"type": "multiply", "value": 1.50}},
                        {"id": "80mm",  "label": "80mm",  "priceModifier": {"type": "multiply", "value": 1.80}},
                        {"id": "100mm", "label": "100mm", "priceModifier": {"type": "multiply", "value": 2.40}}
                    ]'::jsonb
                )
            ELSE opt
        END
    )
    FROM jsonb_array_elements(options) AS opt
)
WHERE slug = 'acrylic-keychain';

-- ====================== rubber-keychain ======================
-- 50mm基準。参考相場: 100個¥140-200, 1,000個¥95-140, 10,000個¥65-85, 100,000個¥45-55
UPDATE products
SET price_tiers = '[
    {"minQuantity": 50,     "maxQuantity": 100,    "unitPrice": 170},
    {"minQuantity": 101,    "maxQuantity": 200,    "unitPrice": 150, "discountPercent": 12},
    {"minQuantity": 201,    "maxQuantity": 300,    "unitPrice": 138, "discountPercent": 19},
    {"minQuantity": 301,    "maxQuantity": 500,    "unitPrice": 125, "discountPercent": 26},
    {"minQuantity": 501,    "maxQuantity": 1000,   "unitPrice": 110, "discountPercent": 35},
    {"minQuantity": 1001,   "maxQuantity": 2000,   "unitPrice": 95,  "discountPercent": 44},
    {"minQuantity": 2001,   "maxQuantity": 3000,   "unitPrice": 88,  "discountPercent": 48},
    {"minQuantity": 3001,   "maxQuantity": 5000,   "unitPrice": 82,  "discountPercent": 52},
    {"minQuantity": 5001,   "maxQuantity": 10000,  "unitPrice": 75,  "discountPercent": 56},
    {"minQuantity": 10001,  "maxQuantity": 20000,  "unitPrice": 68,  "discountPercent": 60},
    {"minQuantity": 20001,  "maxQuantity": 50000,  "unitPrice": 62,  "discountPercent": 64},
    {"minQuantity": 50001,  "maxQuantity": 100000, "unitPrice": 56,  "discountPercent": 67},
    {"minQuantity": 100001, "maxQuantity": 200000, "unitPrice": 52,  "discountPercent": 69}
]'::jsonb
WHERE slug = 'rubber-keychain';

UPDATE products
SET options = (
    SELECT jsonb_agg(
        CASE
            WHEN opt->>'id' = 'size' THEN
                jsonb_set(
                    opt,
                    '{values}',
                    '[
                        {"id": "40mm",  "label": "40mm",  "priceModifier": {"type": "multiply", "value": 0.80}},
                        {"id": "50mm",  "label": "50mm"},
                        {"id": "60mm",  "label": "60mm",  "priceModifier": {"type": "multiply", "value": 1.25}},
                        {"id": "70mm",  "label": "70mm",  "priceModifier": {"type": "multiply", "value": 1.50}},
                        {"id": "80mm",  "label": "80mm",  "priceModifier": {"type": "multiply", "value": 1.80}},
                        {"id": "100mm", "label": "100mm", "priceModifier": {"type": "multiply", "value": 2.40}}
                    ]'::jsonb
                )
            ELSE opt
        END
    )
    FROM jsonb_array_elements(options) AS opt
)
WHERE slug = 'rubber-keychain';

-- ====================== pin-badge ======================
-- 40mm基準。参考相場: 100個¥200-350, 1,000個¥150-220, 10,000個¥110-150, 100,000個¥85-110
UPDATE products
SET price_tiers = '[
    {"minQuantity": 50,     "maxQuantity": 100,    "unitPrice": 280},
    {"minQuantity": 101,    "maxQuantity": 200,    "unitPrice": 250, "discountPercent": 11},
    {"minQuantity": 201,    "maxQuantity": 300,    "unitPrice": 225, "discountPercent": 20},
    {"minQuantity": 301,    "maxQuantity": 500,    "unitPrice": 200, "discountPercent": 29},
    {"minQuantity": 501,    "maxQuantity": 1000,   "unitPrice": 180, "discountPercent": 36},
    {"minQuantity": 1001,   "maxQuantity": 2000,   "unitPrice": 160, "discountPercent": 43},
    {"minQuantity": 2001,   "maxQuantity": 3000,   "unitPrice": 148, "discountPercent": 47},
    {"minQuantity": 3001,   "maxQuantity": 5000,   "unitPrice": 138, "discountPercent": 51},
    {"minQuantity": 5001,   "maxQuantity": 10000,  "unitPrice": 128, "discountPercent": 54},
    {"minQuantity": 10001,  "maxQuantity": 20000,  "unitPrice": 118, "discountPercent": 58},
    {"minQuantity": 20001,  "maxQuantity": 50000,  "unitPrice": 108, "discountPercent": 61},
    {"minQuantity": 50001,  "maxQuantity": 100000, "unitPrice": 100, "discountPercent": 64},
    {"minQuantity": 100001, "maxQuantity": 200000, "unitPrice": 92,  "discountPercent": 67}
]'::jsonb
WHERE slug = 'pin-badge';

UPDATE products
SET options = (
    SELECT jsonb_agg(
        CASE
            WHEN opt->>'id' = 'size' THEN
                jsonb_set(
                    opt,
                    '{values}',
                    '[
                        {"id": "20mm", "label": "20mm", "priceModifier": {"type": "multiply", "value": 0.70}},
                        {"id": "30mm", "label": "30mm", "priceModifier": {"type": "multiply", "value": 0.85}},
                        {"id": "40mm", "label": "40mm"},
                        {"id": "50mm", "label": "50mm", "priceModifier": {"type": "multiply", "value": 1.18}},
                        {"id": "60mm", "label": "60mm", "priceModifier": {"type": "multiply", "value": 1.35}},
                        {"id": "70mm", "label": "70mm", "priceModifier": {"type": "multiply", "value": 1.55}},
                        {"id": "80mm", "label": "80mm", "priceModifier": {"type": "multiply", "value": 1.75}}
                    ]'::jsonb
                )
            ELSE opt
        END
    )
    FROM jsonb_array_elements(options) AS opt
)
WHERE slug = 'pin-badge';
