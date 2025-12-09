import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import app from './app';
import connectDB from './db';

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    app.listen(PORT, () => {
      console.log('╔════════════════════════════════════════════╗');
      console.log('║     Day 13 - MongoDB CRUD API Server       ║');
      console.log('╠════════════════════════════════════════════╣');
      console.log(`║  🚀 Server running on port ${PORT}             ║`);
      console.log(`║  📝 Environment: ${process.env.NODE_ENV || 'development'}          ║`);
      console.log('║                                            ║');
      console.log('║  Endpoints:                                ║');
      console.log('║  • GET    /api/items       - List items    ║');
      console.log('║  • GET    /api/items/:id   - Get item      ║');
      console.log('║  • POST   /api/items       - Create item   ║');
      console.log('║  • PUT    /api/items/:id   - Update item   ║');
      console.log('║  • DELETE /api/items/:id   - Delete item   ║');
      console.log('║  • GET    /api/health      - Health check  ║');
      console.log('║  • POST   /api/seed        - Seed database ║');
      console.log('╚════════════════════════════════════════════╝');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
