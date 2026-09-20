-- DukaanPilot — reset demo state. Run before every rehearsal and before judging.
-- Restores stock to known values and clears test orders + logs.

BEGIN;

DELETE FROM order_items
WHERE order_id IN (SELECT id FROM orders WHERE store_id = '00000000-0000-0000-0000-000000000001');
DELETE FROM orders        WHERE store_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM activity_logs WHERE store_id = '00000000-0000-0000-0000-000000000001';

-- Stock levels chosen so the demo scenarios land predictably:
--   Britannia Bread = 4  → "10 bread" cleanly triggers the insufficient-stock path
--   two Amul milks       → "milk" cleanly triggers the ambiguity path
UPDATE products SET stock_quantity = v.qty
FROM (VALUES
  ('MAG001', 37), ('AMU001', 18), ('AMU002', 7),  ('BRI001', 4),
  ('AMU003', 13), ('PAR001', 26), ('COK001', 11), ('LAY001', 19),
  ('SUR001', 6),  ('AAS001', 3),  ('TAT001', 45), ('FOR001', 8),
  ('COL001', 12), ('LUX001', 22), ('RED001', 9)
) AS v(sku, qty)
WHERE products.sku = v.sku
  AND products.store_id = '00000000-0000-0000-0000-000000000001';

COMMIT;

SELECT name, sku, price, stock_quantity
FROM products
WHERE store_id = '00000000-0000-0000-0000-000000000001'
ORDER BY name;
