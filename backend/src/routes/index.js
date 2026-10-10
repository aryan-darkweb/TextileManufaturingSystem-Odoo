const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const inventoryRoutes = require('./inventory.routes');
const salesRoutes = require('./sales.routes');
const purchaseRoutes = require('./purchase.routes');
const dispatchRoutes = require('./dispatch.routes');
const manufacturingRoutes = require('./manufacturing.routes');
const qualityRoutes = require('./quality.routes');
const hrRoutes = require('./hr.routes');
const dashboardRoutes = require('./dashboard.routes');

// System Health Endpoint
router.use('/health', healthRoutes);

// Supply Chain & Logistics (Lead: Kishan)
router.use('/inventory', inventoryRoutes);
router.use('/sales', salesRoutes);
router.use('/purchase', purchaseRoutes);
router.use('/dispatch', dispatchRoutes);

// Factory Operations (Lead: Teammate)
router.use('/manufacturing', manufacturingRoutes);
router.use('/quality', qualityRoutes);
router.use('/hr', hrRoutes);

// Cross-Module Unified Dashboard (Joint)
router.use('/dashboard', dashboardRoutes);

module.exports = router;
