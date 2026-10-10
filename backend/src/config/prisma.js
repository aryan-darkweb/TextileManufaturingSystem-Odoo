const { PrismaClient } = require('@prisma/client');
const env = require('./env');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['error', 'warn']
    });
  }
  prisma = global.__prisma;
}

/**
 * Safe database connection check that never logs or discloses credentials
 */
async function checkDatabaseConnection() {
  if (!env.validation.isValid) {
    return {
      connected: false,
      configured: false,
      error: env.validation.errors[0]
    };
  }

  try {
    // Run lightweight query to verify connectivity
    await prisma.$queryRaw`SELECT 1 as health_check;`;
    return {
      connected: true,
      configured: true,
      message: 'Supabase PostgreSQL database is connected and responsive.'
    };
  } catch (error) {
    return {
      connected: false,
      configured: true,
      error: `Database connection failed: ${error.message || 'Unknown database error'}`
    };
  }
}

module.exports = {
  prisma,
  checkDatabaseConnection
};
