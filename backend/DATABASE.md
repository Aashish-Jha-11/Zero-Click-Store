# Database Setup Instructions

## Step 1: Run Schema

1. Open Supabase dashboard: https://bsdcklnrujljtfqmvsln.supabase.co
2. Go to SQL Editor
3. Copy and paste the entire contents of `schema.sql`
4. Click "Run"

This creates all tables, indexes, RLS policies, and the `finalize_order` RPC function.

## Step 2: Run Seed Data

1. In SQL Editor, create a new query
2. Copy and paste the entire contents of `seed.sql`
3. Click "Run"

This creates:
- Demo store: "Sharma General Store"
- 15 Indian Kirana products with realistic stock levels
- 1 test customer

## Step 3: Verify

Run this query to verify:

```sql
SELECT 
  s.name as store_name,
  COUNT(p.id) as product_count,
  SUM(p.stock_quantity) as total_stock
FROM stores s
LEFT JOIN products p ON p.store_id = s.id
GROUP BY s.id, s.name;
```

Expected output:
- Store: Sharma General Store
- Products: 15
- Total stock: ~220+ items

## Demo Store ID

The demo store ID is: `00000000-0000-0000-0000-000000000001`

This is hardcoded in the auth middleware fallback for demo mode (no login required).

## Testing the RPC Function

Test the atomic order creation:

```sql
SELECT finalize_order(
  '00000000-0000-0000-0000-000000000001'::UUID,  -- store_id
  NULL,  -- customer_id
  '[
    {"product_id": "<maggi_product_id>", "quantity": 2, "unit_price": 14.00},
    {"product_id": "<milk_product_id>", "quantity": 1, "unit_price": 58.00}
  ]'::JSONB,
  86.00  -- total
);
```

Replace `<maggi_product_id>` and `<milk_product_id>` with actual UUIDs from the products table.
