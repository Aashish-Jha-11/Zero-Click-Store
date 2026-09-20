import { supabase } from '../lib/supabase.js';

/** Items at or below this level are flagged for restock. */
export const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 5);

export interface LowStockItem {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  unit: string | null;
  severity: 'out_of_stock' | 'critical' | 'low';
}

function severityFor(qty: number): LowStockItem['severity'] {
  if (qty <= 0) return 'out_of_stock';
  if (qty <= Math.ceil(LOW_STOCK_THRESHOLD / 2)) return 'critical';
  return 'low';
}

/** Bonus: automatic low-stock alerting, computed from live inventory. */
export async function getLowStockAlerts(storeId: string): Promise<LowStockItem[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, unit')
    .eq('store_id', storeId)
    .eq('active', true)
    .lte('stock_quantity', LOW_STOCK_THRESHOLD)
    .order('stock_quantity', { ascending: true });

  if (error) throw new Error(`Failed to fetch low stock: ${error.message}`);

  return (data ?? []).map((p) => ({ ...p, severity: severityFor(p.stock_quantity) }));
}

/**
 * Alerts for the specific products an order just touched.
 * Called right after create_order so the shopkeeper is warned the moment a sale
 * pushes an item under the threshold — not on the next dashboard refresh.
 */
export async function getAlertsForProducts(productIds: string[]): Promise<LowStockItem[]> {
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, unit')
    .in('id', productIds)
    .lte('stock_quantity', LOW_STOCK_THRESHOLD);

  if (error) return [];
  return (data ?? []).map((p) => ({ ...p, severity: severityFor(p.stock_quantity) }));
}
