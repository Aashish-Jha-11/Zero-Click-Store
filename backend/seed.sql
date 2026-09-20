-- Seed Data for DukaanPilot Demo
-- Run this AFTER schema.sql

-- Create demo store (owner_id should be updated with actual user UUID after auth setup)
-- For demo purposes without auth, we'll create a store directly
INSERT INTO stores (id, name, owner_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sharma General Store',
  NULL -- Will be updated when a user signs up
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo products with realistic Indian Kirana items
INSERT INTO products (store_id, name, normalized_name, category, price, stock_quantity, unit, sku) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Maggi 2-Minute Noodles 70g', 'maggi 2-minute noodles 70g', 'Instant Food', 14.00, 37, 'pack', 'MAG001'),
  ('00000000-0000-0000-0000-000000000001', 'Amul Taaza Milk 1L', 'amul taaza milk 1l', 'Dairy', 58.00, 18, 'liter', 'AMU001'),
  ('00000000-0000-0000-0000-000000000001', 'Amul Gold Milk 1L', 'amul gold milk 1l', 'Dairy', 68.00, 7, 'liter', 'AMU002'),
  ('00000000-0000-0000-0000-000000000001', 'Britannia Bread 400g', 'britannia bread 400g', 'Bakery', 35.00, 4, 'pack', 'BRI001'),
  ('00000000-0000-0000-0000-000000000001', 'Amul Butter 100g', 'amul butter 100g', 'Dairy', 60.00, 13, 'pack', 'AMU003'),
  ('00000000-0000-0000-0000-000000000001', 'Parle-G Biscuits 250g', 'parle-g biscuits 250g', 'Snacks', 25.00, 26, 'pack', 'PAR001'),
  ('00000000-0000-0000-0000-000000000001', 'Coca-Cola 750ml', 'coca-cola 750ml', 'Beverages', 40.00, 11, 'bottle', 'COK001'),
  ('00000000-0000-0000-0000-000000000001', 'Lays Classic Salted 50g', 'lays classic salted 50g', 'Snacks', 20.00, 19, 'pack', 'LAY001'),
  ('00000000-0000-0000-0000-000000000001', 'Surf Excel Detergent 1kg', 'surf excel detergent 1kg', 'Household', 180.00, 6, 'pack', 'SUR001'),
  ('00000000-0000-0000-0000-000000000001', 'Aashirvaad Atta 5kg', 'aashirvaad atta 5kg', 'Staples', 285.00, 3, 'pack', 'AAS001'),
  ('00000000-0000-0000-0000-000000000001', 'Tata Salt 1kg', 'tata salt 1kg', 'Staples', 22.00, 45, 'pack', 'TAT001'),
  ('00000000-0000-0000-0000-000000000001', 'Fortune Sunflower Oil 1L', 'fortune sunflower oil 1l', 'Oil', 165.00, 8, 'liter', 'FOR001'),
  ('00000000-0000-0000-0000-000000000001', 'Colgate Toothpaste 200g', 'colgate toothpaste 200g', 'Personal Care', 95.00, 12, 'pack', 'COL001'),
  ('00000000-0000-0000-0000-000000000001', 'Lux Soap 125g', 'lux soap 125g', 'Personal Care', 45.00, 22, 'pack', 'LUX001'),
  ('00000000-0000-0000-0000-000000000001', 'Red Bull Energy Drink 250ml', 'red bull energy drink 250ml', 'Beverages', 125.00, 9, 'can', 'RED001')
ON CONFLICT DO NOTHING;

-- Optionally insert a test customer
INSERT INTO customers (store_id, name, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Rahul Kumar', '+919876543210')
ON CONFLICT DO NOTHING;

-- Display summary
SELECT
  'Demo store created: ' || name as message
FROM stores
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT
  COUNT(*) || ' products seeded' as message
FROM products
WHERE store_id = '00000000-0000-0000-0000-000000000001';
