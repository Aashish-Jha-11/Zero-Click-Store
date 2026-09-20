import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, resolveStoreId } from '../middleware/auth.js';
import {
  getInventory,
  createProduct,
  updateProduct,
  deactivateProduct,
} from '../services/inventory.service.js';
import { getLowStockAlerts, LOW_STOCK_THRESHOLD } from '../services/alerts.service.js';

const router = Router();

/** Express 5 types route params as string | string[]. */
const param = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

const ProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  price: z.number().nonnegative('Price cannot be negative'),
  stock_quantity: z.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative'),
  category: z.string().max(60).nullish(),
  unit: z.string().max(20).nullish(),
  sku: z.string().max(40).nullish(),
});

const PatchSchema = ProductSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  'Nothing to update'
);

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    res.json({ success: true, inventory: await getInventory(storeId) });
  } catch (err) {
    next(err);
  }
});

/** Bonus: automatic low-stock alerting. */
router.get('/alerts', authMiddleware, async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    res.json({
      success: true,
      threshold: LOW_STOCK_THRESHOLD,
      alerts: await getLowStockAlerts(storeId),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const parsed = ProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    }
    const storeId = await resolveStoreId(req);
    const product = await createProduct(storeId, parsed.data);
    return res.status(201).json({ success: true, product });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    const parsed = PatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    }
    const storeId = await resolveStoreId(req);
    const product = await updateProduct(storeId, param(req.params.id), parsed.data);
    return res.json({ success: true, product });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    const product = await deactivateProduct(storeId, param(req.params.id));
    return res.json({ success: true, product });
  } catch (err) {
    return next(err);
  }
});

export default router;
