/**
 * Factory Operations Smoke Test Suite
 * Executes acceptance flow:
 * 1. Health check & DB connectivity
 * 2. Create production order with materials
 * 3. Verify requirement-vs-available shows SHORT
 * 4. Start & complete all four stages (stock deducted exactly once; repeat complete returns 409)
 * 5. Log PASSED, REWORK, and REJECTED rolls
 * 6. Verify dispatch-ready = passed - reserved
 * 7. Verify dispatch above dispatchReadyRolls is refused with 409
 * 8. Record bulk shift attendance and verify monthly summary
 */

const http = require('http');
const app = require('../src/app');
const { prisma, checkDatabaseConnection } = require('../src/config/prisma');

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

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`   ✓ ${message}`);
}

async function runSmokeTests() {
  console.log('🧪 Starting Factory Operations Smoke Test Suite...\n');

  // Start Express on an ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`🚀 Smoke test server listening on ephemeral port ${port}\n`);

  try {
    // 1. Health Check
    console.log('STEP 1: Verify System & API Health');
    const healthRes = await makeRequest(port, 'GET', '/api/health');
    assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
    assert(healthRes.data?.data?.modules?.manufacturing !== undefined, 'Manufacturing module mounted in health');
    assert(healthRes.data?.data?.modules?.quality !== undefined, 'Quality module mounted in health');
    assert(healthRes.data?.data?.modules?.hr !== undefined, 'HR module mounted in health');

    const dbHealth = await checkDatabaseConnection();
    if (!dbHealth.connected) {
      console.log('\n⚠️  Notice: Database is not connected (DATABASE_URL not configured in backend/.env).');
      console.log('Testing endpoint validation and route contract responses...');

      // Test validation rejects without DB crash
      const invalidOrder = await makeRequest(port, 'POST', '/api/manufacturing/orders', {});
      assert(invalidOrder.status === 400, 'POST /api/manufacturing/orders with empty body returns 400 Bad Request');

      const invalidInsp = await makeRequest(port, 'POST', '/api/quality/inspections', {});
      assert(invalidInsp.status === 400, 'POST /api/quality/inspections with empty body returns 400 Bad Request');

      const invalidAtt = await makeRequest(port, 'POST', '/api/hr/attendance/bulk', {});
      assert(invalidAtt.status === 400, 'POST /api/hr/attendance/bulk with empty body returns 400 Bad Request');

      console.log('\n✅ All API routes, middleware, and validation checks passed successfully!');
      console.log('To run end-to-end database tests, supply DATABASE_URL in backend/.env and re-run.');
      return;
    }

    console.log('   ✓ Supabase PostgreSQL database is connected. Executing full end-to-end acceptance flow.\n');

    // 2. Setup Products & Customer for smoke run
    console.log('STEP 2: Setup Test Master Records');
    const timestamp = Date.now().toString().slice(-5);

    const testFinishedProduct = await prisma.product.upsert({
      where: { code: `SMK-FAB-${timestamp}` },
      update: {},
      create: {
        code: `SMK-FAB-${timestamp}`,
        name: `Smoke Fabric ${timestamp}`,
        type: 'FINISHED_GOODS',
        category: 'Fabric',
        unit: 'METER',
        currentStock: 0.0,
        minimumStock: 100.0,
        unitCost: 400.0
      }
    });

    const testRawMaterial = await prisma.product.upsert({
      where: { code: `SMK-YRN-${timestamp}` },
      update: { currentStock: 500.0 },
      create: {
        code: `SMK-YRN-${timestamp}`,
        name: `Smoke Yarn ${timestamp}`,
        type: 'RAW_MATERIAL',
        category: 'Yarn',
        unit: 'KG',
        currentStock: 500.0,
        minimumStock: 50.0,
        unitCost: 250.0
      }
    });

    const testShortMaterial = await prisma.product.upsert({
      where: { code: `SMK-SHORT-${timestamp}` },
      update: { currentStock: 10.0 },
      create: {
        code: `SMK-SHORT-${timestamp}`,
        name: `Smoke Short Material ${timestamp}`,
        type: 'RAW_MATERIAL',
        category: 'Chemical',
        unit: 'KG',
        currentStock: 10.0, // stock = 10
        minimumStock: 50.0,
        unitCost: 600.0
      }
    });

    const testCustomer = await prisma.customer.create({
      data: {
        name: `Smoke Buyer ${timestamp}`,
        email: `buyer_${timestamp}@test.com`
      }
    });

    const testSalesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: `SO-SMK-${timestamp}`,
        customerId: testCustomer.id,
        deliveryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'CONFIRMED',
        items: {
          create: [
            {
              productId: testFinishedProduct.id,
              fabricType: 'Twill',
              color: 'Navy',
              quantity: 200.0,
              unitPrice: 400.0,
              totalPrice: 80000.0
            }
          ]
        }
      }
    });

    console.log('   ✓ Master records created\n');

    // 3. Create Production Order with Planned Materials (one with shortage)
    console.log('STEP 3: Create Production Order & Verify Material Shortage');
    const createOrderRes = await makeRequest(port, 'POST', '/api/manufacturing/orders', {
      salesOrderId: testSalesOrder.id,
      productId: testFinishedProduct.id,
      targetQuantity: 200.0,
      materials: [
        { rawMaterialId: testRawMaterial.id, stage: 'SPINNING', plannedQuantity: 100.0 },
        { rawMaterialId: testShortMaterial.id, stage: 'DYEING', plannedQuantity: 50.0 } // 50 planned, 10 in stock -> SHORT
      ]
    });

    assert(createOrderRes.status === 201, 'POST /api/manufacturing/orders returns 201 Created');
    const orderId = createOrderRes.data.data.id;
    const orderNumber = createOrderRes.data.data.orderNumber;
    assert(createOrderRes.data.data.stage === 'SPINNING', 'New order stage is SPINNING');
    assert(createOrderRes.data.data.status === 'PLANNED', 'New order status is PLANNED');

    // Verify Shortage
    const shortageRes = await makeRequest(port, 'GET', `/api/manufacturing/materials/requirement-vs-available/${orderId}`);
    assert(shortageRes.status === 200, 'GET requirement-vs-available returns 200 OK');
    const shortItem = shortageRes.data.data.materials.find((m) => m.rawMaterialId === testShortMaterial.id);
    assert(shortItem && shortItem.status === 'SHORT', 'Shortage correctly flagged as SHORT');

    // 4. Stage Progression Flow
    console.log('\nSTEP 4: Stage Progression (Spinning -> Weaving -> Dyeing -> Finishing)');

    // 4a. Start SPINNING
    const startSpinningRes = await makeRequest(port, 'POST', `/api/manufacturing/orders/${orderId}/stages/start`, {
      notes: 'Starting spinning'
    });
    assert(startSpinningRes.status === 200, 'Start SPINNING returns 200 OK');

    // 4b. Complete SPINNING
    const initialRawStock = (await prisma.product.findUnique({ where: { id: testRawMaterial.id } })).currentStock;
    const completeSpinningRes = await makeRequest(port, 'POST', `/api/manufacturing/orders/${orderId}/stages/complete`, {
      outputQuantity: 195.0,
      wasteQuantity: 5.0
    });
    assert(completeSpinningRes.status === 200, 'Complete SPINNING returns 200 OK');
    const afterSpinningStock = (await prisma.product.findUnique({ where: { id: testRawMaterial.id } })).currentStock;
    assert(afterSpinningStock === initialRawStock - 100.0, 'Raw yarn deducted exactly once (100 kg)');

    // 4c. Verify repeating complete returns 409
    const repeatCompleteRes = await makeRequest(port, 'POST', `/api/manufacturing/orders/${orderId}/stages/complete`, {
      outputQuantity: 195.0
    });
    assert(repeatCompleteRes.status === 409, 'Repeat complete returns 409 Conflict guard');

    // 4d. Start & Complete WEAVING
    await makeRequest(port, 'POST', `/api/manufacturing/orders/${orderId}/stages/start`, {});
    const completeWeavingRes = await makeRequest(port, 'POST', `/api/manufacturing/orders/${orderId}/stages/complete`, {
      outputQuantity: 190.0,
      wasteQuantity: 5.0
    });
    assert(completeWeavingRes.status === 200, 'WEAVING completed');

    // 4e. Replenish short material so DYEING doesn't fail stock check
    await prisma.product.update({
      where: { id: testShortMaterial.id },
      data: { currentStock: 200.0 }
    });

    // 4f. Start & Complete DYEING
    await makeRequest(port, 'POST', `/api/manufacturing/orders/${orderId}/stages/start`, {});
    const completeDyeingRes = await makeRequest(port, 'POST', `/api/manufacturing/orders/${orderId}/stages/complete`, {
      outputQuantity: 185.0,
      wasteQuantity: 5.0
    });
    assert(completeDyeingRes.status === 200, 'DYEING completed and chemical deducted');

    // 4g. Start & Complete FINISHING (final stage: triggers PRODUCTION_OUTPUT and status COMPLETED)
    await makeRequest(port, 'POST', `/api/manufacturing/orders/${orderId}/stages/start`, {});
    const completeFinishingRes = await makeRequest(port, 'POST', `/api/manufacturing/orders/${orderId}/stages/complete`, {
      outputQuantity: 180.0,
      wasteQuantity: 5.0
    });
    assert(completeFinishingRes.status === 200, 'FINISHING completed');
    assert(completeFinishingRes.data.data.status === 'COMPLETED', 'Order status is COMPLETED');

    const finishedGoodsStock = (await prisma.product.findUnique({ where: { id: testFinishedProduct.id } })).currentStock;
    assert(finishedGoodsStock === 180.0, 'Finished goods inventory stock incremented by 180 meters');

    // 5. Quality Control: Log Inspections
    console.log('\nSTEP 5: Quality Roll Inspections (PASSED, REWORK, REJECTED)');
    const roll1Res = await makeRequest(port, 'POST', '/api/quality/inspections', {
      productionOrderId: orderId,
      rollNumber: `ROLL-SMK-01-${timestamp}`,
      metersInspected: 60.0,
      status: 'PASSED'
    });
    assert(roll1Res.status === 201, 'Roll 1 (PASSED) logged');

    const roll2Res = await makeRequest(port, 'POST', '/api/quality/inspections', {
      productionOrderId: orderId,
      rollNumber: `ROLL-SMK-02-${timestamp}`,
      metersInspected: 60.0,
      status: 'PASSED'
    });
    assert(roll2Res.status === 201, 'Roll 2 (PASSED) logged');

    const roll3Res = await makeRequest(port, 'POST', '/api/quality/inspections', {
      productionOrderId: orderId,
      rollNumber: `ROLL-SMK-03-${timestamp}`,
      metersInspected: 40.0,
      status: 'REWORK',
      defects: [{ defectType: 'COLOR_MISMATCH', defectQty: 1, severity: 'MAJOR' }]
    });
    assert(roll3Res.status === 201, 'Roll 3 (REWORK) logged');

    const roll4Res = await makeRequest(port, 'POST', '/api/quality/inspections', {
      productionOrderId: orderId,
      rollNumber: `ROLL-SMK-04-${timestamp}`,
      metersInspected: 20.0,
      status: 'REJECTED',
      defects: [{ defectType: 'HOLES', defectQty: 2, severity: 'CRITICAL' }]
    });
    assert(roll4Res.status === 201, 'Roll 4 (REJECTED) logged');

    // 6. Verify Dispatch-Readiness
    console.log('\nSTEP 6: Dispatch-Ready Calculation (Passed - Reserved)');
    const dispatchReadyRes = await makeRequest(port, 'GET', `/api/quality/dispatch-ready/by-sales-order/${testSalesOrder.id}`);
    assert(dispatchReadyRes.status === 200, 'GET dispatch-ready returns 200 OK');
    assert(dispatchReadyRes.data.data.passedRolls === 2, '2 rolls are PASSED');
    assert(dispatchReadyRes.data.data.dispatchReadyRolls === 2, 'dispatchReadyRolls equals 2');
    assert(dispatchReadyRes.data.data.blockedRolls === 2, '2 rolls blocked (1 REWORK, 1 REJECTED)');

    // 7. Verify Dispatch above Dispatch-Ready is Refused with 409
    console.log('\nSTEP 7: Dispatch Gate Enforcement');
    const overDispatchRes = await makeRequest(port, 'POST', '/api/dispatch', {
      salesOrderId: testSalesOrder.id,
      vehicleNumber: 'MH-04-AB-1234',
      destination: 'Surat Garments Hub',
      dispatchedRollCount: 5 // Trying to dispatch 5 when only 2 are ready
    });
    assert(overDispatchRes.status === 409, 'Dispatch of 5 rolls refused with 409 Conflict');

    // Valid Dispatch of 1 roll succeeds
    const validDispatchRes = await makeRequest(port, 'POST', '/api/dispatch', {
      salesOrderId: testSalesOrder.id,
      vehicleNumber: 'MH-04-AB-1234',
      destination: 'Surat Garments Hub',
      dispatchedRollCount: 1
    });
    assert(validDispatchRes.status === 200 || validDispatchRes.status === 201, 'Dispatch of 1 roll accepted');

    // After dispatching 1 roll, dispatchReadyRolls becomes 1 (2 passed - 1 dispatched)
    const afterDispatchReady = await makeRequest(port, 'GET', `/api/quality/dispatch-ready/by-sales-order/${testSalesOrder.id}`);
    assert(afterDispatchReady.data.data.dispatchReadyRolls === 1, 'dispatchReadyRolls decremented to 1 (2 passed - 1 reserved)');

    // 8. HR & Attendance Acceptance
    console.log('\nSTEP 8: HR & Attendance Bulk Register');
    const employee1 = await prisma.employee.create({
      data: {
        employeeCode: `EMP-SMK-1-${timestamp}`,
        name: 'Smoke Worker 1',
        department: 'SPINNING',
        role: 'Spinner',
        wagePerShift: 600.0
      }
    });

    const employee2 = await prisma.employee.create({
      data: {
        employeeCode: `EMP-SMK-2-${timestamp}`,
        name: 'Smoke Worker 2',
        department: 'WEAVING',
        role: 'Weaver',
        wagePerShift: 700.0
      }
    });

    const bulkAttendanceRes = await makeRequest(port, 'POST', '/api/hr/attendance/bulk', {
      date: new Date().toISOString().split('T')[0],
      shift: 'MORNING',
      records: [
        { employeeId: employee1.id, status: 'PRESENT' },
        { employeeId: employee2.id, status: 'HALF_DAY' }
      ]
    });
    assert(bulkAttendanceRes.status === 201, 'Bulk attendance recorded with 201 Created');
    assert(bulkAttendanceRes.data.data[0].wageCalculated === 600.0, 'PRESENT wage = 600.0');
    assert(bulkAttendanceRes.data.data[1].wageCalculated === 350.0, 'HALF_DAY wage = 350.0 (50%)');

    const summaryRes = await makeRequest(port, 'GET', `/api/hr/attendance/summary?month=${new Date().toISOString().slice(0, 7)}`);
    assert(summaryRes.status === 200, 'Monthly attendance summary returns 200 OK');

    console.log('\n🎉 ALL ACCEPTANCE SMOKE TESTS PASSED SUCCESSFULLY! 100% End-to-End Verified.');
  } finally {
    server.close();
  }
}

runSmokeTests().catch((err) => {
  console.error('\n❌ Smoke Test Execution Failed:', err);
  process.exit(1);
});
