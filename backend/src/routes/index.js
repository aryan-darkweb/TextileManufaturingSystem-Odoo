const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const inventoryRoutes = require('./inventory.routes');
const salesRoutes = require('./sales.routes');
const purchaseRoutes = require('./purchase.routes');
const dispatchRoutes = require('./dispatch.routes');
const manufacturingRoutes = require('./manufacturing.routes');
const qualityRoutes = require('./quality.routes');
const dashboardRoutes = require('./dashboard.routes');
const accountingRoutes = require('./accounting.routes');
const millFlowRoutes = require('./millFlow.routes');

// System Health Endpoint
router.use('/health', healthRoutes);

// Core Streamlined Mill Flow Pipeline (Everest Textile Mill Model)
router.use('/mill-flow', millFlowRoutes);

// Supply Chain & Logistics (Lead: Kishan)
router.use('/inventory', inventoryRoutes);
router.use('/sales', salesRoutes);
router.use('/purchase', purchaseRoutes);
router.use('/dispatch', dispatchRoutes);

// Factory Operations (Lead: Teammate)
router.use('/manufacturing', manufacturingRoutes);
router.use('/quality', qualityRoutes);

// Accounting, Transactions & Owner Month-End Closing
router.use('/accounting', accountingRoutes);
router.use('/transactions', accountingRoutes);

// Cross-Module Unified Dashboard (Joint)
router.use('/dashboard', dashboardRoutes);

module.exports = router;
