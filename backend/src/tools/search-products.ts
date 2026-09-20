import { searchProducts } from '../services/product.service.js';

export async function handleSearchProducts(storeId: string, input: { query: string }) {
  const products = await searchProducts(storeId, input.query);
  return { products };
}
