const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { checkDatabaseConnection } = require('./config/prisma');

const PORT = env.port;

const server = app.listen(PORT, async () => {
  logger.startup();
  console.log(`Server listening at http://localhost:${PORT}`);
  console.log(`Health check:    http://localhost:${PORT}/api/health`);
  console.log(`Inventory API:   http://localhost:${PORT}/api/inventory/products`);
  console.log(`Sales API:       http://localhost:${PORT}/api/sales/orders`);

  // Non-blocking database connectivity check on start
  if (env.validation.isValid) {
    const dbStatus = await checkDatabaseConnection();
    if (dbStatus.connected) {
      logger.info('✅ Supabase PostgreSQL connection verified successfully.');
    } else {
      logger.warn(`⚠️ Supabase connection warning: ${dbStatus.error}`);
    }
  } else {
    logger.warn('⚠️ Server started without Supabase credentials. Once backend/.env is populated, restart or invoke /api/health.');
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});
