import { supabase } from '../lib/supabase.js';

export async function searchProducts(storeId: string, query: string) {
  // Use ilike for fuzzy matching on name and normalized_name
  const normalizedQuery = query.toLowerCase().trim();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, price, stock_quantity, unit, sku')
    .eq('store_id', storeId)
    .eq('active', true)
    .or(`normalized_name.ilike.%${normalizedQuery}%,name.ilike.%${normalizedQuery}%,category.ilike.%${normalizedQuery}%`)
    .order('name')
    .limit(10);

  if (error) throw new Error(`Product search failed: ${error.message}`);
  return data || [];
}

export async function getProductById(productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) throw new Error(`Product not found: ${error.message}`);
  return data;
}

export async function getAllProducts(storeId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, price, stock_quantity, unit, sku, active')
    .eq('store_id', storeId)
    .eq('active', true)
    .order('category')
    .order('name');

  if (error) throw new Error(`Failed to fetch products: ${error.message}`);
  return data || [];
}
