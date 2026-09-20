import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

// For the hackathon, auth is optional — if no token, use demo store
// This keeps the autonomous demo working without OAuth setup
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    // Demo mode: attach a default store context
    (req as any).storeId = null; // will be resolved to the demo store
    (req as any).userId = null;
    return next();
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    (req as any).userId = user.id;
    // Resolve store from user profile
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    (req as any).storeId = store?.id || null;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Auth error' });
  }
}

// Helper to get store ID, falling back to demo store
export async function resolveStoreId(req: Request): Promise<string> {
  const storeId = (req as any).storeId;
  if (storeId) return storeId;

  // Fallback: get the first store (demo mode)
  const { data } = await supabase.from('stores').select('id').limit(1).single();
  return data?.id;
}
