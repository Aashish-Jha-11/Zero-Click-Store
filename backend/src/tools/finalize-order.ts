import { createOrder, type OrderItem } from '../services/order.service.js';

export async function handleCreateOrder(
  storeId: string,
  input: { items: OrderItem[]; total: number; customerId?: string }
) {
  const result = await createOrder(storeId, input.items, input.total, input.customerId);
  return result;
}
