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
    metadata?: Record<string, unknown>;
  }>;
  error?: string;
  requestId: string;
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

export async function getActivity() {
  const res = await fetch(`${API_BASE}/api/activity`);
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}
