import { supabase } from '../lib/supabase.js';

export type EventType =
  | 'request_received'
  | 'intent_parsed'
  | 'product_found'
  | 'inventory_checked'
  | 'price_verified'
  | 'order_created'
  | 'inventory_updated'
  | 'confirmation_sent'
  | 'workflow_failed'
  | 'clarification_needed'
  | 'low_stock_alert';

export async function logActivity(
  storeId: string,
  requestId: string,
  eventType: EventType,
  message: string,
  metadata?: Record<string, unknown>
) {
  const { error } = await supabase.from('activity_logs').insert({
    store_id: storeId,
    request_id: requestId,
    event_type: eventType,
    message,
    metadata: metadata || {},
  });

  if (error) {
    console.error('[ActivityLog] Failed to write:', error.message);
  }
}

export async function getActivityLogs(storeId: string, limit = 50) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch activity: ${error.message}`);
  return data || [];
}

export async function getActivityByRequestId(requestId: string) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch activity: ${error.message}`);
  return data || [];
}
