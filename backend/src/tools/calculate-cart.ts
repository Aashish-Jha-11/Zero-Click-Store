import { supabase } from '../lib/supabase.js';

interface CartItem {
  productId: string;
  quantity: number;
}

export async function handleCalculateCart(
  _storeId: string,
  input: { items: CartItem[] }
) {
  // Fetch authoritative prices from DB
  const productIds = input.items.map((i) => i.productId);
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price')
    .in('id', productIds);

  if (error || !products) throw new Error('Failed to fetch prices');

  const priceMap = new Map(products.map((p) => [p.id, p]));

  const lineItems = input.items.map((item) => {
    const product = priceMap.get(item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);

    return {
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      lineTotal: product.price * item.quantity,
    };
  });

  const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);

  return {
    items: lineItems,
    subtotal,
    discount: 0,
    total: subtotal,
  };
}
