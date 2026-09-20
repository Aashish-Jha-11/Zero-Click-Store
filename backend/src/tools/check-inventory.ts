import { checkInventory } from '../services/inventory.service.js';

export async function handleCheckInventory(
  _storeId: string,
  input: { productId: string; quantity: number }
) {
  return checkInventory(input.productId, input.quantity);
}
