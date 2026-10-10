const env = require('../config/env');

const logger = {
  info: (msg, meta = '') => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, meta);
  },
  warn: (msg, meta = '') => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, meta);
  },
  error: (msg, meta = '') => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, meta);
  },
  startup: () => {
    console.log('----------------------------------------------------');
    console.log(`🚀 TextileFlow Monolithic Backend Server`);
    console.log(`   Port:        ${env.port}`);
    console.log(`   Environment: ${env.nodeEnv}`);
    console.log(`   CORS Origin: ${env.corsOrigin}`);
    console.log(
      `   DB Status:   ${
        env.validation.isValid
          ? `Configured (${env.maskConnectionString(env.databaseUrl)})`
          : '⚠️ Not configured - Waiting for valid DATABASE_URL in backend/.env'
      }`
    );
    if (!env.validation.isValid) {
      env.validation.errors.forEach((err) => console.warn(`   ⚠️ ${err}`));
    }
    console.log('----------------------------------------------------');
  }
};

module.exports = logger;
