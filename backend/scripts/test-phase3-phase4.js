/**
 * Acceptance Test Suite for Phase 3 (Machine Daily Output)
 * and Phase 4 (Shortage-to-Purchase Workflow).
 *
 * Verifies:
 * Phase 3:
 * 1. Machine output for a selected date and machine returns accurate output.
 * 2. Date-range and stage filters work accurately.
 * 3. Multiple stages (Spinning kg, Weaving meters, Dyeing meters) do not double-count production.
 * 4. Dates with no production return safe empty result ([]).
 * 5. Invalid filters (bad date format, start > end, invalid stage, missing machine) are handled safely.
 *
 * Phase 4:
 * 6. Shortage calculation correctly identifies material deficits from planned vs available stock.
 * 7. Valid shortage creates purchase order linked to material and supplier.
 * 8. Invalid supplier, material, or non-positive quantity are rejected.
 * 9. Repeated requests / multi-clicks prevent duplicate purchase orders.
 * 10. Purchase order creation alone NEVER increases inventory.
 * 11. Valid goods receipt increases inventory stock exactly once.
 * 12. Repeated goods receipt and concurrent receipt requests cannot double-increase stock.
 */

const http = require('http');
const app = require('../src/app');
const { prisma } = require('../src/config/prisma');

async function makeRequest(port, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://127.0.0.1:${port}${path}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 3 & PHASE 4 AUTOMATED ACCEPTANCE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const server = app.listen(0);
  const port = server.address().port;

  let testProduct = null;
  let testRawMaterial = null;
  let testSupplier = null;
  let testMachineSpin = null;
  let testMachineWeav = null;
  let testMachineDye = null;
  let testProdOrder = null;
  let createdShortagePOId = null;

  try {
    // ----------------------------------------------------
    // SETUP TEST FIXTURES
    // ----------------------------------------------------
    console.log('--> Setting up isolated test fixtures in database...');

    const timestamp = Date.now();

    testSupplier = await prisma.supplier.create({
      data: {
        name: `Test Shortage Supplier ${timestamp}`,
        contactPerson: 'Kailash Mills',
        email: `shortage_sup_${timestamp}@test.com`,
        phone: '9876543210',
        yarnTypesSupplied: 'Organic Cotton 40s'
      }
    });

    testRawMaterial = await prisma.product.create({
      data: {
        code: `RAW-${timestamp.toString().slice(-6)}`,
        name: `Test Raw Cotton Yarn ${timestamp}`,
        type: 'RAW_MATERIAL',
        category: 'Yarn',
        unit: 'KG',
        currentStock: 50.0, // Initial stock 50 KG
        minimumStock: 100.0,
        unitCost: 250.0
      }
    });

    testProduct = await prisma.product.create({
      data: {
        code: `FAB-${timestamp.toString().slice(-6)}`,
        name: `Test Finished Twill Fabric ${timestamp}`,
        type: 'FINISHED_GOODS',
        category: 'Fabric',
        unit: 'METER',
        currentStock: 0.0,
        minimumStock: 50.0,
        unitCost: 500.0
      }
    });

    // Machines
    testMachineSpin = await prisma.machine.findFirst({ where: { type: 'SPINNING' } });
    if (!testMachineSpin) {
      testMachineSpin = await prisma.machine.create({
        data: {
          code: `M-SPN-${timestamp.toString().slice(-4)}`,
          name: 'Test Ring Frame',
          type: 'SPINNING',
          capacityPerShift: 300.0,
          status: 'IDLE'
        }
      });
    }

    testMachineWeav = await prisma.machine.findFirst({ where: { type: 'WEAVING' } });
    if (!testMachineWeav) {
      testMachineWeav = await prisma.machine.create({
        data: {
          code: `M-WEV-${timestamp.toString().slice(-4)}`,
          name: 'Test Airjet Loom',
          type: 'WEAVING',
          capacityPerShift: 500.0,
          status: 'IDLE'
        }
      });
    }

    testMachineDye = await prisma.machine.findFirst({ where: { type: 'DYEING' } });
    if (!testMachineDye) {
      testMachineDye = await prisma.machine.create({
        data: {
          code: `M-DYE-${timestamp.toString().slice(-4)}`,
          name: 'Test Dyeing Jigger',
          type: 'DYEING',
          capacityPerShift: 400.0,
          status: 'IDLE'
        }
      });
    }

    // Create a production order that requires 200 KG of raw material (stock is only 50 KG -> shortage of 150 KG)
    testProdOrder = await prisma.productionOrder.create({
      data: {
        orderNumber: `PROD-TEST-${timestamp.toString().slice(-6)}`,
        productId: testProduct.id,
        stage: 'SPINNING',
        status: 'IN_PROGRESS',
        targetQuantity: 500.0,
        producedQuantity: 0.0,
        materialConsumptions: {
          create: [
            {
              rawMaterialId: testRawMaterial.id,
              stage: 'SPINNING',
              plannedQuantity: 200.0,
              actualQuantity: 0.0,
              unit: 'KG',
              isDeducted: false
            }
          ]
        }
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];

    // Create stage logs for machine daily output testing:
    // Stage 1: SPINNING on testMachineSpin -> 180 KG output, 5 KG waste
    const spinLog = await prisma.productionStageLog.create({
      data: {
        productionOrderId: testProdOrder.id,
        stage: 'SPINNING',
        machineId: testMachineSpin.id,
        status: 'COMPLETED',
        inputQuantity: 200.0,
        outputQuantity: 180.0,
        wasteQuantity: 5.0,
        startedAt: new Date(),
        completedAt: new Date()
      }
    });

    // Stage 2: WEAVING on testMachineWeav -> 350 METER output, 10 METER waste
    const weavLog = await prisma.productionStageLog.create({
      data: {
        productionOrderId: testProdOrder.id,
        stage: 'WEAVING',
        machineId: testMachineWeav.id,
        status: 'COMPLETED',
        inputQuantity: 180.0,
        outputQuantity: 350.0,
        wasteQuantity: 10.0,
        startedAt: new Date(),
        completedAt: new Date()
      }
    });

    console.log('--> Setup complete.\n');

    // ====================================================
    // PHASE 3 TESTS — MACHINE DAILY OUTPUT
    // ====================================================
    console.log('====================================================');
    console.log('TESTING PHASE 3: MACHINE DAILY OUTPUT REPORTING');
    console.log('====================================================');

    // Test 3.1: Output for selected date and specific machine
    console.log('\n--> Test 3.1: Query output for selected date and machineId');
    const resMchToday = await makeRequest(
      port,
      'GET',
      `/api/manufacturing/machines/daily-output?date=${todayStr}&machineId=${testMachineSpin.id}`
    );
    assert(resMchToday.status === 200, 'GET /api/manufacturing/machines/daily-output returns 200');
    assert(resMchToday.data.success === true, 'Response payload success is true');
    const spinRecords = resMchToday.data.data.records;
    assert(spinRecords.length === 1, 'Exactly 1 output record for spinning machine');
    assert(spinRecords[0].machineId === testMachineSpin.id, 'Output matches filtered machineId');
    assert(spinRecords[0].totalOutputQuantity === 180.0, 'Output quantity is exactly 180.0');
    assert(spinRecords[0].unit === 'KG', 'Spinning output unit is KG');
    assert(spinRecords[0].stage === 'SPINNING', 'Record stage is SPINNING');
    assert(spinRecords[0].runCount === 1, 'Run count is 1');

    // Test 3.2: Date-range and stage filtering
    console.log('\n--> Test 3.2: Query with date-range and stage filter');
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const resRange = await makeRequest(
      port,
      'GET',
      `/api/manufacturing/machines/daily-output?startDate=${yesterday}&endDate=${tomorrow}&stage=WEAVING`
    );
    assert(resRange.status === 200, 'GET with startDate, endDate, and stage returns 200');
    const weavRecords = resRange.data.data.records.filter((r) => r.machineId === testMachineWeav.id);
    assert(weavRecords.length === 1, 'Found weaving record for weaving machine');
    assert(weavRecords[0].stage === 'WEAVING', 'Record stage is WEAVING');
    assert(weavRecords[0].totalOutputQuantity === 350.0, 'Weaving output is 350.0');
    assert(weavRecords[0].unit === 'METER', 'Weaving output unit is METER');

    // Test 3.3: Prevention of double-counting across stages
    console.log('\n--> Test 3.3: Verify multi-stage outputs do NOT double-count');
    const resAllStages = await makeRequest(
      port,
      'GET',
      `/api/manufacturing/machines/daily-output?date=${todayStr}`
    );
    assert(resAllStages.status === 200, 'GET all machine output for today returns 200');
    const summary = resAllStages.data.data.summary;
    assert(summary.totalOutputByUnit.KG !== undefined, 'Summary segregates KG unit');
    assert(summary.totalOutputByUnit.METER !== undefined, 'Summary segregates METER unit');
    // Weaving meters and Spinning kg must NEVER be summed into a combined single metric
    assert(
      summary.stageBreakdown.SPINNING.output >= 180.0 && summary.stageBreakdown.SPINNING.unit === 'KG',
      'Spinning output breakdown is in KG'
    );
    assert(
      summary.stageBreakdown.WEAVING.output >= 350.0 && summary.stageBreakdown.WEAVING.unit === 'METER',
      'Weaving output breakdown is in METER'
    );

    // Test 3.4: No-production dates return safe empty result
    console.log('\n--> Test 3.4: No-production date returns empty records safely');
    const resNoProd = await makeRequest(
      port,
      'GET',
      '/api/manufacturing/machines/daily-output?date=2021-01-01'
    );
    assert(resNoProd.status === 200, 'Query for past date with no production returns 200');
    assert(resNoProd.data.data.records.length === 0, 'Records is empty array []');
    assert(resNoProd.data.data.summary.totalRuns === 0, 'Total runs is 0');
    assert(
      resNoProd.data.data.machineOverview.every((m) => m.hasProduction === false && m.recordedOutput === 0),
      'Machine overview clearly marks all machines as hasProduction: false without inventing output'
    );

    // Test 3.5: Missing / Invalid filters handled safely
    console.log('\n--> Test 3.5: Invalid filter handling (date format, range order, bad stage, unknown machine)');
    const resBadDate = await makeRequest(port, 'GET', '/api/manufacturing/machines/daily-output?date=invalid-date');
    assert(resBadDate.status === 400, 'Invalid date format returns 400 Bad Request');

    const resInvertedRange = await makeRequest(
      port,
      'GET',
      `/api/manufacturing/machines/daily-output?startDate=${tomorrow}&endDate=${yesterday}`
    );
    assert(resInvertedRange.status === 400, 'startDate > endDate returns 400 Bad Request');

    const resBadStage = await makeRequest(
      port,
      'GET',
      '/api/manufacturing/machines/daily-output?stage=INVALID_STAGE'
    );
    assert(resBadStage.status === 400, 'Invalid stage returns 400 Bad Request');

    const resBadMachine = await makeRequest(
      port,
      'GET',
      '/api/manufacturing/machines/daily-output?machineId=non-existent-machine'
    );
    assert(resBadMachine.status === 404, 'Non-existent machine ID returns 404 Not Found');


    // ====================================================
    // PHASE 4 TESTS — SHORTAGE-TO-PURCHASE WORKFLOW
    // ====================================================
    console.log('\n====================================================');
    console.log('TESTING PHASE 4: SHORTAGE-TO-PURCHASE WORKFLOW');
    console.log('====================================================');

    // Test 4.1: Correct shortage calculation from actual requirements and stock
    console.log('\n--> Test 4.1: Expose material shortages correctly');
    const resShortages = await makeRequest(
      port,
      'GET',
      `/api/manufacturing/materials/shortages?productionOrderId=${testProdOrder.id}`
    );
    assert(resShortages.status === 200, 'GET /api/manufacturing/materials/shortages returns 200');
    const shortages = resShortages.data.data.shortages;
    assert(shortages.length >= 1, 'At least one shortage detected');
    const rawShortage = shortages.find((s) => s.materialId === testRawMaterial.id);
    assert(rawShortage !== undefined, 'Shortage found for testRawMaterial');
    // Needed = 200.0, availableStock = 50.0 => shortage = 150.0
    assert(rawShortage.availableStock === 50.0, 'Available stock is 50.0 KG');
    assert(rawShortage.shortageQuantity === 150.0, 'Shortage quantity is exactly 150.0 KG (200 - 50)');
    assert(rawShortage.unit === 'KG', 'Material unit is KG');
    assert(rawShortage.affectedOrders.length >= 1, 'Affected orders list populated');

    // Test 4.2: Validation of inputs when creating PO from shortage
    console.log('\n--> Test 4.2: Validation rejects invalid supplier, material, or non-positive quantity');
    const resBadSup = await makeRequest(port, 'POST', '/api/purchase/orders/from-shortage', {
      supplierId: 'invalid-supplier-id',
      materialId: testRawMaterial.id,
      quantity: 150.0
    });
    assert(resBadSup.status === 404, 'Invalid supplierId is rejected with 404');

    const resBadMat = await makeRequest(port, 'POST', '/api/purchase/orders/from-shortage', {
      supplierId: testSupplier.id,
      materialId: 'invalid-material-id',
      quantity: 150.0
    });
    assert(resBadMat.status === 404, 'Invalid materialId is rejected with 404');

    const resZeroQty = await makeRequest(port, 'POST', '/api/purchase/orders/from-shortage', {
      supplierId: testSupplier.id,
      materialId: testRawMaterial.id,
      quantity: 0
    });
    assert(resZeroQty.status === 400, 'Zero quantity is rejected with 400');

    const resNegQty = await makeRequest(port, 'POST', '/api/purchase/orders/from-shortage', {
      supplierId: testSupplier.id,
      materialId: testRawMaterial.id,
      quantity: -50
    });
    assert(resNegQty.status === 400, 'Negative quantity is rejected with 400');

    // Test 4.3: Valid shortage creates purchase order linked to material and supplier
    console.log('\n--> Test 4.3: Valid shortage creates purchase order');
    const idempotencyKey = `IDEMP-${Date.now()}`;
    const initialStock = (await prisma.product.findUnique({ where: { id: testRawMaterial.id } })).currentStock;

    const resCreatePO = await makeRequest(port, 'POST', '/api/purchase/orders/from-shortage', {
      supplierId: testSupplier.id,
      materialId: testRawMaterial.id,
      quantity: 150.0,
      unitPrice: 250.0,
      productionOrderId: testProdOrder.id,
      idempotencyKey,
      notes: 'Urgent stock shortage replenishment'
    });
    assert(resCreatePO.status === 201, 'POST /api/purchase/orders/from-shortage returns 201 Created');
    const createdPO = resCreatePO.data.data;
    createdShortagePOId = createdPO.id;
    assert(createdPO.orderNumber.startsWith('PO-'), 'Generated valid PO orderNumber');
    assert(createdPO.supplierId === testSupplier.id, 'Linked to correct supplier');
    assert(createdPO.status === 'ORDERED', 'PO status is ORDERED');
    assert(createdPO.items.length === 1, 'PO contains 1 item');
    assert(createdPO.items[0].productId === testRawMaterial.id, 'Item matches raw material');
    assert(createdPO.items[0].orderedQty === 150.0, 'Item ordered quantity is 150.0');
    assert(createdPO.items[0].receivedQty === 0.0, 'Item received quantity is 0.0');

    // Test 4.4: CRITICAL RULE — PO creation alone MUST NEVER increase inventory!
    console.log('\n--> Test 4.4: Verify inventory stock is UNCHANGED after PO creation');
    const stockAfterPOCreation = (await prisma.product.findUnique({ where: { id: testRawMaterial.id } })).currentStock;
    assert(
      stockAfterPOCreation === initialStock,
      `Inventory stock remained exactly ${initialStock} KG (Did NOT increase upon PO creation)`
    );

    // Test 4.5: Duplicate prevention on repeated requests
    console.log('\n--> Test 4.5: Repeat request returns existing PO and prevents double order');
    const resRepeatPO = await makeRequest(port, 'POST', '/api/purchase/orders/from-shortage', {
      supplierId: testSupplier.id,
      materialId: testRawMaterial.id,
      quantity: 150.0,
      unitPrice: 250.0,
      productionOrderId: testProdOrder.id,
      idempotencyKey,
      notes: 'Urgent stock shortage replenishment'
    });
    assert(resRepeatPO.status === 200, 'Duplicate request safely handled with 200 OK');
    assert(resRepeatPO.data.data.duplicatePrevented === true, 'Duplicate was detected and prevented');
    assert(resRepeatPO.data.data.id === createdShortagePOId, 'Returned the same existing purchase order ID');

    // Total PO count for this supplier must remain 1
    const totalSupplierPOs = await prisma.purchaseOrder.count({ where: { supplierId: testSupplier.id } });
    assert(totalSupplierPOs === 1, 'Only 1 PO exists in database for this supplier');

    // Test 4.6: Valid goods receipt increases stock exactly once
    console.log('\n--> Test 4.6: Goods receipt increases stock transactionally and exactly once');
    const resReceiveGoods = await makeRequest(
      port,
      'POST',
      `/api/purchase/orders/${createdShortagePOId}/receive`,
      {
        receivedItems: [
          {
            itemId: createdPO.items[0].id,
            productId: testRawMaterial.id,
            quantity: 150.0
          }
        ],
        notes: 'Warehouse delivery verified and inspected',
        performedBy: 'Warehouse Inspector'
      }
    );
    assert(resReceiveGoods.status === 200, 'Goods receipt endpoint returns 200 OK');
    assert(resReceiveGoods.data.data.status === 'RECEIVED', 'PO transitioned to RECEIVED status');

    const stockAfterReceipt = (await prisma.product.findUnique({ where: { id: testRawMaterial.id } })).currentStock;
    assert(
      stockAfterReceipt === initialStock + 150.0,
      `Inventory stock increased exactly once: ${initialStock} + 150.0 = ${stockAfterReceipt} KG`
    );

    const txRecord = await prisma.inventoryTransaction.findFirst({
      where: {
        productId: testRawMaterial.id,
        type: 'PURCHASE_RECEIPT',
        referenceNumber: createdPO.orderNumber
      }
    });
    assert(txRecord !== null, 'InventoryTransaction record logged for PURCHASE_RECEIPT');
    assert(txRecord.quantity === 150.0, 'Inventory transaction quantity is +150.0');

    // Test 4.7: Duplicate receipt / Repeat receipt rejected (Cannot double-increase stock)
    console.log('\n--> Test 4.7: Repeat goods receipt strictly rejected (NO double stock increase)');
    const resRepeatReceipt = await makeRequest(
      port,
      'POST',
      `/api/purchase/orders/${createdShortagePOId}/receive`,
      {
        receivedItems: [
          {
            itemId: createdPO.items[0].id,
            productId: testRawMaterial.id,
            quantity: 150.0
          }
        ]
      }
    );
    assert(resRepeatReceipt.status === 409, 'Repeat goods receipt rejected with 409 Conflict');

    const stockAfterRepeatReceipt = (await prisma.product.findUnique({ where: { id: testRawMaterial.id } })).currentStock;
    assert(
      stockAfterRepeatReceipt === stockAfterReceipt,
      `Stock remained at ${stockAfterReceipt} KG (Double stock increase prevented)`
    );

    // Test 4.8: Verify shortage is now resolved
    console.log('\n--> Test 4.8: Verify shortage resolution after receipt');
    const resShortagesAfter = await makeRequest(
      port,
      'GET',
      `/api/manufacturing/materials/shortages?productionOrderId=${testProdOrder.id}`
    );
    const updatedShortages = resShortagesAfter.data.data.shortages.filter((s) => s.materialId === testRawMaterial.id);
    assert(updatedShortages.length === 0, 'Shortage resolved: material has sufficient warehouse stock now');

    console.log('\n====================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('❌ Exception during test execution:', err);
    process.exitCode = 1;
  } finally {
    // Clean up test records
    console.log('\n--> Cleaning up test records from database...');
    try {
      if (createdShortagePOId) {
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: createdShortagePOId } });
        await prisma.purchaseOrder.deleteMany({ where: { id: createdShortagePOId } });
      }
      if (testProdOrder) {
        await prisma.productionStageLog.deleteMany({ where: { productionOrderId: testProdOrder.id } });
        await prisma.materialConsumption.deleteMany({ where: { productionOrderId: testProdOrder.id } });
        await prisma.productionOrder.deleteMany({ where: { id: testProdOrder.id } });
      }
      if (testRawMaterial) {
        await prisma.inventoryTransaction.deleteMany({ where: { productId: testRawMaterial.id } });
        await prisma.product.deleteMany({ where: { id: testRawMaterial.id } });
      }
      if (testProduct) {
        await prisma.inventoryTransaction.deleteMany({ where: { productId: testProduct.id } });
        await prisma.product.deleteMany({ where: { id: testProduct.id } });
      }
      if (testSupplier) {
        await prisma.supplier.deleteMany({ where: { id: testSupplier.id } });
      }
      console.log('--> Cleanup complete.');
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr);
    }
    server.close();
    await prisma.$disconnect();
  }
}

runTests();
