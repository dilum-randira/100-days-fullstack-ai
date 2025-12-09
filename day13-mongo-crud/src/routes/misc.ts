import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { seedDatabase, isDatabaseEmpty } from '../utils/createSampleData';
import { itemService } from '../services/itemService';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 */
router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStateMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const healthStatus = {
      status: dbState === 1 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        state: dbStateMap[dbState] || 'unknown',
        host: mongoose.connection.host || 'N/A',
        name: mongoose.connection.name || 'N/A',
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      },
    };

    const statusCode = dbState === 1 ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/seed
 * @desc    Seed database with sample data
 * @query   clear - if 'true', clears existing data before seeding
 */
router.post('/seed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clearExisting = req.query.clear === 'true';

    // Check if database already has data
    const isEmpty = await isDatabaseEmpty();

    if (!isEmpty && !clearExisting) {
      res.status(400).json({
        success: false,
        message: 'Database already has data. Use ?clear=true to clear existing data before seeding.',
        itemCount: await itemService.getItemsCount(),
      });
      return;
    }

    const result = await seedDatabase(clearExisting);

    res.status(201).json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        cleared: result.cleared,
        created: result.created,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/stats
 * @desc    Get database statistics
 */
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const itemCount = await itemService.getItemsCount();

    res.status(200).json({
      success: true,
      data: {
        totalItems: itemCount,
        database: mongoose.connection.name,
        collections: Object.keys(mongoose.connection.collections),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/clear
 * @desc    Clear all items from database (USE WITH CAUTION)
 */
router.delete('/clear', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const deletedCount = await itemService.deleteAllItems();

    res.status(200).json({
      success: true,
      message: 'All items deleted successfully',
      deletedCount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
