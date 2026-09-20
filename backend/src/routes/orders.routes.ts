import { Router } from 'express';
import { authMiddleware, resolveStoreId } from '../middleware/auth.js';
import { getOrders, getOrderById } from '../services/order.service.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    const orders = await getOrders(storeId);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.id);
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

export default router;
