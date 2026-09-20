import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.js';
import { LLM_PROVIDER, LLM_MODEL, isLlmConfigured } from './lib/llm.js';
import agentRoutes from './routes/agent.routes.js';
import productRoutes from './routes/products.routes.js';
import orderRoutes from './routes/orders.routes.js';
import activityRoutes from './routes/activity.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';

const app = express();

// Middleware
app.use(helmet());
// Vercel preview deploys get a new hostname every push, so allow the whole
// *.vercel.app space plus anything named in FRONTEND_ORIGIN.
const STATIC_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://dukaanpilot.vercel.app',
  ...(process.env.FRONTEND_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
];

app.use(cors({
  origin(origin, cb) {
    // Same-origin / curl / server-to-server requests have no Origin header.
    if (!origin) return cb(null, true);
    if (STATIC_ORIGINS.includes(origin)) return cb(null, true);
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    llmProvider: LLM_PROVIDER,
    llmModel: LLM_MODEL,
    llmConfigured: isLlmConfigured(),
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/agent', agentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/inventory', inventoryRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
