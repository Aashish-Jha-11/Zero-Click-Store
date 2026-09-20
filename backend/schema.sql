-- DukaanPilot Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STORES TABLE
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL, -- lowercase for fuzzy search
  category TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'unit',
  sku TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast product search
CREATE INDEX IF NOT EXISTS idx_products_normalized_name ON products(normalized_name);
CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, active);

-- 4. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  subtotal DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id, created_at DESC);

-- 6. ORDER_ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL
);

-- 7. ACTIVITY_LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_store ON activity_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_request ON activity_logs(request_id, created_at);

-- 8. ATOMIC ORDER CREATION RPC
CREATE OR REPLACE FUNCTION finalize_order(
  p_store_id UUID,
  p_customer_id UUID,
  p_items JSONB,
  p_total DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_unit_price DECIMAL;
  v_available_stock INTEGER;
  v_subtotal DECIMAL := 0;
BEGIN
  -- Validate all stock BEFORE creating order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT stock_quantity INTO v_available_stock
    FROM products
    WHERE id = v_product_id AND store_id = p_store_id
    FOR UPDATE; -- Lock the row

    IF v_available_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;

    IF v_available_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %: % available, % requested',
        v_product_id, v_available_stock, v_quantity;
    END IF;
  END LOOP;

  -- Create the order
  INSERT INTO orders (store_id, customer_id, status, subtotal, total)
  VALUES (p_store_id, p_customer_id, 'confirmed', p_total, p_total)
  RETURNING id INTO v_order_id;

  -- Create order items and deduct inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::DECIMAL;

    -- Insert order item
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
    VALUES (v_order_id, v_product_id, v_quantity, v_unit_price, v_unit_price * v_quantity);

    -- Deduct inventory
    UPDATE products
    SET stock_quantity = stock_quantity - v_quantity,
        updated_at = NOW()
    WHERE id = v_product_id;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  END LOOP;

  -- Return order details
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total', p_total,
    'subtotal', v_subtotal,
    'items_count', jsonb_array_length(p_items)
  );
END;
$$;

-- 9. ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/update their own
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Stores: Users can only see stores they own
CREATE POLICY "Users can view own stores" ON stores
  FOR SELECT USING (auth.uid() = owner_id);

-- Products: Users can view products from their stores
CREATE POLICY "Users can view own store products" ON products
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- Similar policies for customers, orders, order_items, activity_logs
CREATE POLICY "Users can view own store customers" ON customers
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can view own store orders" ON orders
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can view own store order_items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE store_id IN (
        SELECT id FROM stores WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view own store activity" ON activity_logs
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );
