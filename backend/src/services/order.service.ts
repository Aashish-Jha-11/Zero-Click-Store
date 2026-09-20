import { supabase } from '../lib/supabase.js';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export async function createOrder(
  storeId: string,
  items: OrderItem[],
  total: number,
  customerId?: string
) {
  // Use the finalize_order RPC for atomicity
  const { data, error } = await supabase.rpc('finalize_order', {
    p_store_id: storeId,
    p_customer_id: customerId || null,
    p_items: items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    p_total: total,
  });

  if (error) throw new Error(`Order creation failed: ${error.message}`);
  return data;
}

export async function getOrders(storeId: string, limit = 20) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, subtotal, total, created_at,
      customer:customers(name, phone),
      order_items(
        id, quantity, unit_price, line_total,
        product:products(name, unit)
      )
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return data || [];
}

export async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, store_id, status, subtotal, total, created_at,
      customer:customers(name, phone),
      order_items(
        id, quantity, unit_price, line_total,
        product:products(name, unit)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) throw new Error(`Order not found: ${error.message}`);
  return data;
}
