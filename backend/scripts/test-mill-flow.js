const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('TESTING STREAMLINED MILL FLOW PIPELINE');
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

  try {
    // 1. Pipeline Snapshot
    console.log('--> Test 1: Pipeline Snapshot');
    const pipeRes = await request('GET', '/mill-flow/pipeline');
    assert(pipeRes.status === 200, 'GET /api/mill-flow/pipeline returns 200 OK');
    assert(Array.isArray(pipeRes.body.data.yarns), 'Returns raw material yarns list');
    assert(Array.isArray(pipeRes.body.data.fabrics), 'Returns finished goods fabrics list');
    assert(Array.isArray(pipeRes.body.data.suppliers), 'Returns suppliers list');

    const yarn = pipeRes.body.data.yarns[0];
    const fabric = pipeRes.body.data.fabrics[0];
    const buyer = pipeRes.body.data.buyers[0];
    const supplier = pipeRes.body.data.suppliers[0];

    assert(yarn && fabric && buyer && supplier, 'Found seed yarn, fabric, buyer, and supplier in DB');

    // 2. Step 1: Buyer Order & Dynamic Yarn Recipe Check
    console.log('\n--> Test 2: Buyer Order & Dynamic Yarn Recipe Calculation');
    const initialYarnStock = yarn.currentStock;
    const orderQty = 10; // 10 units fabric
    const yarnRatio = 1.25; // 1.25 units yarn per unit fabric -> 12.5 units yarn needed

    const orderRes = await request('POST', '/mill-flow/orders', {
      buyerId: buyer.id,
      fabricId: fabric.id,
      yarnId: yarn.id,
      quantity: orderQty,
      unitPrice: 500, // ₹500/unit
      yarnRatio: yarnRatio
    });

    assert(orderRes.status === 201, 'POST /api/mill-flow/orders returns 201 Created');
    const reqInfo = orderRes.body.data.yarnRequirement;
    assert(reqInfo.neededQuantity === 12.5, 'Dynamic recipe correctly calculated: 10 * 1.25 = 12.5 units yarn needed');
    assert(reqInfo.yarnId === yarn.id, 'Linked to target raw material yarn');
    const salesOrderId = orderRes.body.data.salesOrder.id;

    // 3. Step 1b: Order Yarn from Supplier (with Add New Supplier capability)
    console.log('\n--> Test 3: Order Yarn from Trusted/New Supplier & Auto-Receive');
    const restockRes = await request('POST', '/mill-flow/yarn/order', {
      newSupplier: {
        name: `Supreme Mill Spinners ${Date.now().toString().slice(-4)}`,
        phone: '9876501234',
        yarnTypesSupplied: 'Combed Cotton 30s'
      },
      yarnId: yarn.id,
      quantity: 100, // Buy 100 kg yarn
      unitPrice: 160, // ₹160/kg
      autoReceive: true
    });

    assert(restockRes.status === 201, 'Yarn ordered and auto-received with 201 Created');
    assert(restockRes.body.data.supplier.name.includes('Supreme Mill Spinners'), 'Added new supplier to trusted list on the fly');
    assert(restockRes.body.data.yarn.newStock === initialYarnStock + 100, `Stock increased by 100 from ${initialYarnStock} to ${restockRes.body.data.yarn.newStock}`);

    // 4. Step 2: Start Production & Immediately Deduct Yarn from Inventory
    console.log('\n--> Test 4: Start Production & Deduct Yarn Immediately from Warehouse');
    const stockBeforeProd = restockRes.body.data.yarn.newStock;

    const prodRes = await request('POST', '/mill-flow/production/start', {
      salesOrderId,
      targetQuantity: orderQty,
      yarnId: yarn.id,
      yarnQuantity: 50
    });

    console.log('prodRes status & body:', prodRes.status, prodRes.body);
    assert(prodRes.status === 201, 'POST /api/mill-flow/production/start returns 201 Created');
    assert(prodRes.body.data.deductedYarn.quantityDeducted === 50, 'Yarn deducted: 50 units');
    assert(prodRes.body.data.deductedYarn.remainingStock === stockBeforeProd - 50, 'Warehouse stock reduced immediately by 50 units');
    const productionOrderId = prodRes.body.data.productionOrder.id;

    // 5. Step 3a: Quality Check — Defective Outcome (Wasted Yarn, $0 Revenue)
    console.log('\n--> Test 5: Quality Check — Defective Outcome (Yarn Wasted, Rerun Requested)');
    const qcDefectRes = await request('POST', '/mill-flow/quality/inspect', {
      productionOrderId,
      outcome: 'DEFECTIVE',
      defectNotes: 'Heavy warp tension tearing and oil staining',
      rerunIfDefective: true
    });

    assert(qcDefectRes.status === 200, 'Quality Check Defect returns 200 OK');
    assert(qcDefectRes.body.data.outcome === 'DEFECTIVE', 'Fabric outcome marked DEFECTIVE');
    assert(qcDefectRes.body.data.yarnWastedNotice.includes('₹0'), 'Noted that mill earns ₹0 for the wasted yarn');
    assert(qcDefectRes.body.data.rerunOrder !== null, 'Automatically generated rerun production order for the buyer');

    const rerunOrderId = qcDefectRes.body.data.rerunOrder.id;

    // 6. Step 3b: Quality Check — Good Outcome on Rerun
    console.log('\n--> Test 6: Quality Check — Good Outcome on Rerun');
    // Start rerun
    await request('POST', '/mill-flow/production/start', {
      salesOrderId,
      targetQuantity: orderQty,
      yarnId: yarn.id,
      yarnQuantity: 50
    });

    const qcGoodRes = await request('POST', '/mill-flow/quality/inspect', {
      productionOrderId: rerunOrderId,
      outcome: 'GOOD',
      metersInspected: 10
    });

    assert(qcGoodRes.status === 200, 'Quality Check Good returns 200 OK');
    assert(qcGoodRes.body.data.outcome === 'GOOD', 'Fabric outcome marked GOOD');
    assert(qcGoodRes.body.data.fabricStatus === 'APPROVED_FOR_DISPATCH', 'Fabric marked APPROVED_FOR_DISPATCH');

    // 7. Step 4: Dispatch & Deliver to Buyer (Generates Fabric Sales Revenue)
    console.log('\n--> Test 7: Dispatch & Deliver Fabric to Buyer');
    const dispatchRes = await request('POST', '/mill-flow/dispatch', {
      salesOrderId,
      vehicleNumber: 'MH-14-BT-9922',
      destination: 'Everest Garments Hub, Mumbai'
    });

    console.log('dispatchRes status & body:', dispatchRes.status, dispatchRes.body);
    assert(dispatchRes.status === 200, 'POST /api/mill-flow/dispatch returns 200 OK');
    assert(dispatchRes.body.data.revenueGenerated === 10 * 500, 'Revenue recognized for 10 units @ ₹500 = ₹5,000');

    // 8. Step 5: Owner Monthly Financial Statement & Transactions
    console.log('\n--> Test 8: Owner Financial Statement (Fabric Revenue vs Yarn Cost = Profit/Loss)');
    const finRes = await request('GET', '/mill-flow/owner-financials');
    assert(finRes.status === 200, 'GET /api/mill-flow/owner-financials returns 200 OK');
    const fin = finRes.body.data.summary;
    assert(fin.totalFabricSalesRevenue > 0, `Total Fabric Sales Revenue tracked: ₹${fin.totalFabricSalesRevenue}`);
    assert(fin.totalSpentOnYarn > 0, `Total Spent on Raw Material Yarn tracked: ₹${fin.totalSpentOnYarn}`);
    assert(fin.totalWastedYarnQuantity > 0, `Wasted yarn from defective runs tracked: ${fin.totalWastedYarnQuantity} units`);
    assert(typeof fin.netProfitOrLoss === 'number', `Net Profit or Loss computed: ₹${fin.netProfitOrLoss}`);
    assert(Array.isArray(finRes.body.data.transactions), 'Monthly Transactions ledger returned with chronological entries');

    console.log('\n====================================================');
    console.log(`MILL FLOW TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
