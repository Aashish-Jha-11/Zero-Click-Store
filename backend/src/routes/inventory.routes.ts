import { Router } from 'express';
import { authMiddleware, resolveStoreId } from '../middleware/auth.js';
import { getInventory } from '../services/inventory.service.js';
import { getLowStockAlerts, LOW_STOCK_THRESHOLD } from '../services/alerts.service.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    const inventory = await getInventory(storeId);
    res.json({ success: true, inventory });
  } catch (err) {
    next(err);
  }
});

/** Bonus: automatic low-stock alerting. */
router.get('/alerts', authMiddleware, async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    const alerts = await getLowStockAlerts(storeId);
    res.json({ success: true, threshold: LOW_STOCK_THRESHOLD, alerts });
  } catch (err) {
    next(err);
  }
});

export default router;
