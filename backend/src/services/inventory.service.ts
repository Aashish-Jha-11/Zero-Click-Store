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
    .select('id, name, stock_quantity, unit, category, price, sku')
    .eq('store_id', storeId)
    .eq('active', true)
    .order('stock_quantity', { ascending: true });

  if (error) throw new Error(`Failed to fetch inventory: ${error.message}`);
  return data || [];
}

export interface ProductInput {
  name: string;
  price: number;
  stock_quantity: number;
  category?: string | null;
  unit?: string | null;
  sku?: string | null;
}

export async function createProduct(storeId: string, input: ProductInput) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      store_id: storeId,
      name: input.name.trim(),
      // The agent matches on this, so it must stay in sync with name.
      normalized_name: input.name.trim().toLowerCase(),
      category: input.category?.trim() || null,
      price: input.price,
      stock_quantity: input.stock_quantity,
      unit: input.unit?.trim() || 'unit',
      sku: input.sku?.trim() || null,
      active: true,
    })
    .select('id, name, category, price, stock_quantity, unit, sku')
    .single();

  if (error) throw new Error(`Could not add product: ${error.message}`);
  return data;
}

export async function updateProduct(
  storeId: string,
  productId: string,
  patch: Partial<ProductInput>
) {
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) {
    fields.name = patch.name.trim();
    fields.normalized_name = patch.name.trim().toLowerCase();
  }
  if (patch.price !== undefined) fields.price = patch.price;
  if (patch.stock_quantity !== undefined) fields.stock_quantity = patch.stock_quantity;
  if (patch.category !== undefined) fields.category = patch.category?.trim() || null;
  if (patch.unit !== undefined) fields.unit = patch.unit?.trim() || 'unit';
  if (patch.sku !== undefined) fields.sku = patch.sku?.trim() || null;

  const { data, error } = await supabase
    .from('products')
    .update(fields)
    .eq('id', productId)
    .eq('store_id', storeId)
    .select('id, name, category, price, stock_quantity, unit, sku')
    .single();

  if (error) throw new Error(`Could not update product: ${error.message}`);
  if (!data) throw new Error('Product not found in this store');
  return data;
}

/**
 * Soft delete. Past orders reference this row, so removing it would break
 * order history; `active: false` hides it from the agent and the shelf instead.
 */
export async function deactivateProduct(storeId: string, productId: string) {
  const { data, error } = await supabase
    .from('products')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('store_id', storeId)
    .select('id, name')
    .single();

  if (error) throw new Error(`Could not remove product: ${error.message}`);
  if (!data) throw new Error('Product not found in this store');
  return data;
}
