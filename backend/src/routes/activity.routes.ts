import { Router } from 'express';
import { authMiddleware, resolveStoreId } from '../middleware/auth.js';
import { getActivityLogs, getActivityByRequestId } from '../services/activity.service.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    const logs = await getActivityLogs(storeId);
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});

router.get('/request/:requestId', async (req, res, next) => {
  try {
    const logs = await getActivityByRequestId(req.params.requestId);
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});

export default router;
