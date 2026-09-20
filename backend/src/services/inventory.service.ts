import { supabase } from '../lib/supabase.js';

export async function checkInventory(productId: string, requestedQty: number) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, stock_quantity')
    .eq('id', productId)
    .single();

  if (error || !data) throw new Error(`Product not found: ${productId}`);

  return {
    available: data.stock_quantity >= requestedQty,
    requested: requestedQty,
    availableQuantity: data.stock_quantity,
    productName: data.name,
  };
}

export async function getInventory(storeId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, stock_quantity, unit, category')
    .eq('store_id', storeId)
    .eq('active', true)
    .order('stock_quantity', { ascending: true });

  if (error) throw new Error(`Failed to fetch inventory: ${error.message}`);
  return data || [];
}
