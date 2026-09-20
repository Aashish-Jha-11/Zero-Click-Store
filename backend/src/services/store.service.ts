import { supabase } from '../lib/supabase.js';

/** The catalogue every new store starts with, so a fresh sign-in is never empty. */
const STARTER_CATALOGUE: Array<{
  name: string; category: string; price: number; stock: number; unit: string; sku: string;
}> = [
  { name: 'Maggi 2-Minute Noodles 70g', category: 'Instant Food', price: 14, stock: 37, unit: 'pack', sku: 'MAG001' },
  { name: 'Amul Taaza Milk 1L', category: 'Dairy', price: 58, stock: 18, unit: 'liter', sku: 'AMU001' },
  { name: 'Amul Gold Milk 1L', category: 'Dairy', price: 68, stock: 7, unit: 'liter', sku: 'AMU002' },
  { name: 'Britannia Bread 400g', category: 'Bakery', price: 35, stock: 4, unit: 'pack', sku: 'BRI001' },
  { name: 'Amul Butter 100g', category: 'Dairy', price: 60, stock: 13, unit: 'pack', sku: 'AMU003' },
  { name: 'Parle-G Biscuits 250g', category: 'Snacks', price: 25, stock: 26, unit: 'pack', sku: 'PAR001' },
  { name: 'Coca-Cola 750ml', category: 'Beverages', price: 40, stock: 11, unit: 'bottle', sku: 'COK001' },
  { name: 'Lays Classic Salted 50g', category: 'Snacks', price: 20, stock: 19, unit: 'pack', sku: 'LAY001' },
  { name: 'Surf Excel Detergent 1kg', category: 'Household', price: 180, stock: 6, unit: 'pack', sku: 'SUR001' },
  { name: 'Aashirvaad Atta 5kg', category: 'Staples', price: 285, stock: 3, unit: 'pack', sku: 'AAS001' },
  { name: 'Tata Salt 1kg', category: 'Staples', price: 22, stock: 45, unit: 'pack', sku: 'TAT001' },
  { name: 'Fortune Sunflower Oil 1L', category: 'Oil', price: 165, stock: 8, unit: 'liter', sku: 'FOR001' },
  { name: 'Colgate Toothpaste 200g', category: 'Personal Care', price: 95, stock: 12, unit: 'pack', sku: 'COL001' },
  { name: 'Lux Soap 125g', category: 'Personal Care', price: 45, stock: 22, unit: 'pack', sku: 'LUX001' },
  { name: 'Red Bull Energy Drink 250ml', category: 'Beverages', price: 125, stock: 9, unit: 'can', sku: 'RED001' },
];

async function seedCatalogue(storeId: string) {
  const rows = STARTER_CATALOGUE.map((p) => ({
    store_id: storeId,
    name: p.name,
    normalized_name: p.name.toLowerCase(),
    category: p.category,
    price: p.price,
    stock_quantity: p.stock,
    unit: p.unit,
    sku: p.sku,
    active: true,
  }));
  const { error } = await supabase.from('products').insert(rows);
  if (error) console.error('[store] seed failed:', error.message);
}

/**
 * Every signed-in shopkeeper gets their own store.
 *
 * Without this, all users shared whichever store happened to be first in the
 * table — one person deleting a product emptied it for everyone.
 */
export async function getOrCreateStoreForUser(userId: string, displayName?: string | null) {
  const { data: existing } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const name = displayName ? `${displayName}'s Store` : 'My Kirana Store';
  const { data: created, error } = await supabase
    .from('stores')
    .insert({ name, owner_id: userId })
    .select('id')
    .single();

  if (error || !created) throw new Error(`Could not create store: ${error?.message}`);

  await seedCatalogue(created.id);
  return created.id;
}

/** Shared read-only store for visitors who have not signed in. */
export async function getDemoStoreId(): Promise<string> {
  const { data } = await supabase
    .from('stores')
    .select('id')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();

  if (data?.id) return data.id;

  const { data: fallback } = await supabase.from('stores').select('id').limit(1).single();
  return fallback!.id;
}
