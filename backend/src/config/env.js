const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend folder if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function validateEnv() {
  const errors = [];
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    errors.push(
      'DATABASE_URL is missing. Please configure DATABASE_URL in backend/.env with your Supabase PostgreSQL connection string.'
    );
  } else if (
    databaseUrl.includes('PASTE_YOUR_SUPABASE') ||
    databaseUrl.includes('[YOUR_PROJECT_REF]') ||
    databaseUrl.trim() === ''
  ) {
    errors.push(
      'DATABASE_URL contains the unconfigured placeholder. Please replace it in backend/.env with your real Supabase connection string.'
    );
  } else if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    errors.push(
      'DATABASE_URL format is invalid. It must begin with "postgresql://" or "postgres://".'
    );
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper to mask connection strings safely for logs
function maskConnectionString(url) {
  if (!url) return 'NOT_CONFIGURED';
  try {
    const parsed = new URL(url);
    const username = parsed.username ? parsed.username : 'user';
    const host = parsed.host ? parsed.host : 'host';
    const pathname = parsed.pathname || '';
    return `postgresql://${username}:******@${host}${pathname}`;
  } catch {
    return 'postgresql://*****:*****@masked-host/postgres';
  }
}

const envConfig = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
  validation: validateEnv(),
  maskConnectionString
};

module.exports = envConfig;
