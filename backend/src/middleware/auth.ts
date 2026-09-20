import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';
import { getOrCreateStoreForUser, getDemoStoreId } from '../services/store.service.js';

/**
 * Auth is optional: a signed-out visitor still gets a working demo store, so the
 * live link is explorable without a login. A signed-in shopkeeper gets their own
 * store, provisioned and seeded on first request.
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    (req as any).userId = null;
    (req as any).storeId = null;
    return next();
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      // An expired token should degrade to the demo store, not a hard 401 that
      // makes the whole app look broken.
      (req as any).userId = null;
      (req as any).storeId = null;
      return next();
    }

    (req as any).userId = user.id;
    (req as any).storeId = await getOrCreateStoreForUser(
      user.id,
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
    );
    return next();
  } catch (err) {
    console.error('[auth] token check failed:', err);
    (req as any).userId = null;
    (req as any).storeId = null;
    return next();
  }
}

export async function resolveStoreId(req: Request): Promise<string> {
  return (req as any).storeId || (await getDemoStoreId());
}
