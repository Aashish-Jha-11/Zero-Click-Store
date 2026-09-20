import { getProductById } from '../services/product.service.js';

export async function handleGetPrice(_storeId: string, input: { productId: string }) {
  const product = await getProductById(input.productId);
  return { unitPrice: product.price, productName: product.name };
}
