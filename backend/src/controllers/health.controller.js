const { checkDatabaseConnection } = require('../config/prisma');
const env = require('../config/env');
const { success } = require('../utils/apiResponse');

async function getHealth(req, res, next) {
  try {
    const dbStatus = await checkDatabaseConnection();

    const healthData = {
      status: dbStatus.connected ? 'healthy' : 'degraded',
      service: 'TextileFlow Monolithic Backend',
      environment: env.nodeEnv,
      port: env.port,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        configured: dbStatus.configured,
        connected: dbStatus.connected,
        provider: 'Supabase PostgreSQL',
        statusMessage: dbStatus.message || dbStatus.error || 'Database connection pending'
      },
      modules: {
        inventory: 'ACTIVE',
        sales: 'ACTIVE',
        purchase: 'READY_FOR_INTEGRATION',
        dispatch: 'READY_FOR_INTEGRATION',
        manufacturing: 'READY_FOR_INTEGRATION (Factory Operations)',
        quality: 'READY_FOR_INTEGRATION (Factory Operations)',
        hr: 'READY_FOR_INTEGRATION (Factory Operations)',
        dashboard: 'ACTIVE'
      }
    };

    return success(res, healthData, 'Health check completed');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHealth
};
