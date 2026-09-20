const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface AgentResponse {
  success: boolean;
  response: string;
  order?: {
    order_id: string;
    total: number;
    subtotal: number;
    items_count: number;
  };
  events: Array<{
    type: string;
    message: string;
    metadata?: {
      tool?: string;
      input?: Record<string, unknown>;
      result?: Record<string, unknown>;
      [k: string]: unknown;
    };
  }>;
  error?: string;
  requestId: string;
  /** 'llm' = model-planned, 'fallback' = deterministic parser. */
  mode?: 'llm' | 'fallback';
  provider?: string;
  model?: string;
  lowStockAlerts?: LowStockAlert[];
}

export interface LowStockAlert {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  unit: string | null;
  severity: 'out_of_stock' | 'critical' | 'low';
}

export async function runAgent(message: string): Promise<AgentResponse> {
  const res = await fetch(`${API_BASE}/api/agent/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'Failed to process request');
  }

  return res.json();
}

export async function getOrders() {
  const res = await fetch(`${API_BASE}/api/orders`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function getInventory() {
  const res = await fetch(`${API_BASE}/api/inventory`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function getLowStockAlerts(): Promise<{
  success: boolean;
  threshold: number;
  alerts: LowStockAlert[];
}> {
  const res = await fetch(`${API_BASE}/api/inventory/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function getActivity() {
  const res = await fetch(`${API_BASE}/api/activity`);
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}

export interface Product {
  id: string;
  name: string;
  category: string | null;
  price: number;
  stock_quantity: number;
  unit: string | null;
  sku?: string | null;
}

export interface ProductInput {
  name: string;
  price: number;
  stock_quantity: number;
  category?: string | null;
  unit?: string | null;
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export async function createProduct(input: ProductInput) {
  const res = await fetch(`${API_BASE}/api/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return json<{ success: true; product: Product }>(res);
}

export async function updateProduct(id: string, patch: Partial<ProductInput>) {
  const res = await fetch(`${API_BASE}/api/inventory/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return json<{ success: true; product: Product }>(res);
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${API_BASE}/api/inventory/${id}`, { method: 'DELETE' });
  return json<{ success: true; product: { id: string; name: string } }>(res);
}

/** Wake a sleeping free-tier backend while the visitor reads the page. */
export function warmBackend() {
  fetch(`${API_BASE}/api/health`, { cache: 'no-store' }).catch(() => {});
}
