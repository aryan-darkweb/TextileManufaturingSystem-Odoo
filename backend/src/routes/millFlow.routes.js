const express = require('express');
const router = express.Router();
const millFlowController = require('../controllers/millFlow.controller');

// 1. Pipeline Snapshot
router.get('/pipeline', millFlowController.getMillPipeline);

// 2. Buyer Order & Yarn BOM Check
router.post('/orders', millFlowController.createBuyerOrderWithYarnCheck);

// 3. Quick Yarn Restock from Existing or New Supplier
router.post('/yarn/order', millFlowController.orderYarnFromSupplier);

// 4. Start Production (Atomically deducts raw yarn from inventory)
router.post('/production/start', millFlowController.startProductionAndDeductYarn);

// 5. Quality Check (Good Fabric -> Dispatch vs Defective Fabric -> Wasted Yarn & Rerun)
router.post('/quality/inspect', millFlowController.recordQualityInspection);

// 6. Dispatch & Delivery
router.post('/dispatch', millFlowController.dispatchFabricToBuyer);

// 7. Owner Monthly Financial Statement & Transactions
router.get('/owner-financials', millFlowController.getOwnerMonthlyFinancials);

// 8. Stage Machines Overview & Live Metrics
router.get('/machines', millFlowController.getStageMachines);
router.patch('/machines/:id/status', millFlowController.updateMachineStatus);

// 9. Advance Production through 3 Steps (Spinning -> Weaving -> Dyeing -> Completed)
router.post('/production/:id/advance-stage', millFlowController.advanceProductionStage);

module.exports = router;
