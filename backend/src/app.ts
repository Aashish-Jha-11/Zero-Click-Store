import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.js';
import agentRoutes from './routes/agent.routes.js';
import productRoutes from './routes/products.routes.js';
import orderRoutes from './routes/orders.routes.js';
import activityRoutes from './routes/activity.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'https://dukaanpilot.vercel.app']
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
