import express, { Application } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

// Routes
import itemRoutes from './routes/items';
import miscRoutes from './routes/misc';

// Middlewares
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Create Express app
const app: Application = express();

// ============================================
// Middleware Configuration
// ============================================

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging (simple)
app.use((req, _res, next) => {
  console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// Routes
// ============================================

// API routes
app.use('/api/items', itemRoutes);
app.use('/api', miscRoutes);

// Root route
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to Day 13 - MongoDB CRUD API',
    version: '1.0.0',
    endpoints: {
      items: '/api/items',
      health: '/api/health',
      seed: '/api/seed',
      stats: '/api/stats',
      clear: '/api/clear',
    },
    documentation: {
      getAllItems: 'GET /api/items',
      getItemById: 'GET /api/items/:id',
      createItem: 'POST /api/items',
      updateItem: 'PUT /api/items/:id',
      deleteItem: 'DELETE /api/items/:id',
      searchItems: 'GET /api/items/search?q=query',
    },
  });
});

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
