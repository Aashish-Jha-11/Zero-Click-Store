import { Router } from 'express';
import { authMiddleware, resolveStoreId } from '../middleware/auth.js';
import { processAgentRequest } from '../services/agent.service.js';
import { z } from 'zod';

const router = Router();

const AgentRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  customerId: z.string().optional(),
});

router.post('/run', authMiddleware, async (req, res, next) => {
  try {
    // Validate request
    const parsed = AgentRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0].message,
      });
    }

    const { message, customerId } = parsed.data;
    const storeId = await resolveStoreId(req);

    const result = await processAgentRequest(storeId, message, customerId);

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
