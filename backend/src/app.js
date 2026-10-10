const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const env = require('./config/env');

const app = express();

// Enable CORS for all incoming requests (Vite dev server, localhost, etc.)
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome & info endpoint
app.get('/', (req, res) => {
  res.json({
    app: 'TextileFlow Backend API',
    description: 'Unified Monolithic Express API for Everest Textile Mills',
    version: '1.0.0',
    documentation: '/api/health',
    status: 'ONLINE'
  });
});

// Mount all REST modules under /api
app.use('/api', apiRoutes);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

// Central Error Handler
app.use(errorHandler);

module.exports = app;
