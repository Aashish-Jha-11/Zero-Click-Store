import { Router } from 'express';
import { authMiddleware, resolveStoreId } from '../middleware/auth.js';
import { getAllProducts } from '../services/product.service.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    const products = await getAllProducts(storeId);
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
});

export default router;
