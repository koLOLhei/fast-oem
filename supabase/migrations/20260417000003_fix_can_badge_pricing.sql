-- 缶バッジ (can-badge) の価格を市場相場に合わせて全面改訂。
-- 旧: 100個¥119, 10,000個¥14, 30,000個¥12 (原価割れ懸念)
-- 新: 100個¥95, 10,000個¥48, 30,000個¥42 (相場の中央値帯に揃える)
--
-- 参考相場 (2026-04): 100個¥60-95, 500個¥50-85, 1,000個¥46-75, 10,000個¥45-65
-- 30,000個以上の公表単価は業界内で非公開(ASK特価)だが、コスト構造から¥40-45が下限。

UPDATE products
SET price_tiers = '[
    {"minQuantity": 100,    "maxQuantity": 199,    "unitPrice": 95},
    {"minQuantity": 200,    "maxQuantity": 299,    "unitPrice": 88, "discountPercent": 7},
    {"minQuantity": 300,    "maxQuantity": 499,    "unitPrice": 82, "discountPercent": 14},
    {"minQuantity": 500,    "maxQuantity": 999,    "unitPrice": 72, "discountPercent": 24},
    {"minQuantity": 1000,   "maxQuantity": 1999,   "unitPrice": 65, "discountPercent": 32},
    {"minQuantity": 2000,   "maxQuantity": 2999,   "unitPrice": 60, "discountPercent": 37},
    {"minQuantity": 3000,   "maxQuantity": 4999,   "unitPrice": 55, "discountPercent": 42},
    {"minQuantity": 5000,   "maxQuantity": 9999,   "unitPrice": 52, "discountPercent": 45},
    {"minQuantity": 10000,  "maxQuantity": 19999,  "unitPrice": 48, "discountPercent": 49},
    {"minQuantity": 20000,  "maxQuantity": 29999,  "unitPrice": 45, "discountPercent": 53},
    {"minQuantity": 30000,  "maxQuantity": 99999,  "unitPrice": 42, "discountPercent": 56},
    {"minQuantity": 100000, "maxQuantity": 200000, "unitPrice": 40, "discountPercent": 58}
]'::jsonb
WHERE slug = 'can-badge';

-- 缶バッジ size option の priceModifier を multiply 型に揃える。
-- add 型だと大ロット時(例: 10,000個¥48)に -¥4 のように比率が壊れる。
-- 44mm を基準 (1.0) にサイズ間の比率を市場相場に合わせる: 0.65 / 0.85 / 1.0 / 1.15 / 1.70
UPDATE products
SET options = (
    SELECT jsonb_agg(
        CASE
            WHEN opt->>'id' = 'size' THEN
                jsonb_set(
                    opt,
                    '{values}',
                    '[
                        {"id": "25mm", "label": "25mm", "priceModifier": {"type": "multiply", "value": 0.65}},
                        {"id": "32mm", "label": "32mm", "priceModifier": {"type": "multiply", "value": 0.85}},
                        {"id": "44mm", "label": "44mm"},
                        {"id": "55mm", "label": "55mm", "priceModifier": {"type": "multiply", "value": 1.15}},
                        {"id": "75mm", "label": "75mm", "priceModifier": {"type": "multiply", "value": 1.70}}
                    ]'::jsonb
                )
            ELSE opt
        END
    )
    FROM jsonb_array_elements(options) AS opt
)
WHERE slug = 'can-badge';
