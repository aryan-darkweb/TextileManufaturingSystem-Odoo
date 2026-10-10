/**
 * Acceptance Test Suite for Business Rules, Dispatch Workflow & Data Integrity
 *
 * Verifies:
 * 1. Buyer creation: strictly rejects non-10-digit phones (rejects <10, >10, non-digits).
 * 2. Sales Order creation: strictly rejects delivery deadlines in the past (yesterday/earlier).
 * 3. Inventory edit: rejects/ignores arbitrary stock overwrites in updateProduct.
 * 4. Dispatch workflow:
 *    a. Create Sales Order for 120m of product.
 *    b. Ensure warehouse stock is available (e.g. 200m).
 *    c. Confirm dispatch: verify dispatch record, stock decreased from 200 to 80, SO status is DISPATCHED.
 *    d. Repeat confirmation: verify 409 Conflict, stock remains 80 (NO double deduction).
 *    e. Verify insufficient stock dispatch is rejected with 409 Conflict.
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

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`   ✓ ${message}`);
}

async function runAcceptanceTests() {
  console.log('🧪 Starting Business Rules & Dispatch Acceptance Test Suite...\n');

  // Start Express on ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`🚀 Test server listening on ephemeral port ${port}\n`);

  const timestamp = Date.now().toString().slice(-6);

  try {
    // -------------------------------------------------------------
    // TEST 1: Buyer Phone Number (Must be exactly 10 numeric digits)
    // -------------------------------------------------------------
    console.log('TEST 1: Buyer Phone Number Validation (10 digits)');
    
    // 1a. Reject 9 digits
    const res9 = await makeRequest(port, 'POST', '/api/sales/customers', {
      name: `Test Buyer 9 ${timestamp}`,
      phone: '987654321' // 9 digits
    });
    assert(res9.status === 400, 'Rejects 9-digit phone number with 400 Bad Request');

    // 1b. Reject 11 digits
    const res11 = await makeRequest(port, 'POST', '/api/sales/customers', {
      name: `Test Buyer 11 ${timestamp}`,
      phone: '98765432100' // 11 digits
    });
    assert(res11.status === 400, 'Rejects 11-digit phone number with 400 Bad Request');

    // 1c. Reject non-digits
    const resAlpha = await makeRequest(port, 'POST', '/api/sales/customers', {
      name: `Test Buyer Alpha ${timestamp}`,
      phone: '98765abcd0' // letters
    });
    assert(resAlpha.status === 400, 'Rejects phone with letters with 400 Bad Request');

    // 1d. Accept exactly 10 numeric digits
    const validBuyerRes = await makeRequest(port, 'POST', '/api/sales/customers', {
      name: `Test Buyer Valid ${timestamp}`,
      companyName: `Apex Textiles ${timestamp}`,
      phone: '9825011223' // exactly 10 digits
    });
    assert(validBuyerRes.status === 201, 'Accepts exactly 10 numeric digits with 201 Created');
    const validBuyerId = validBuyerRes.data.data.id;

    // -------------------------------------------------------------
    // TEST 2: Sales Order Delivery Deadline (Must be in the future)
    // -------------------------------------------------------------
    console.log('\nTEST 2: Sales Order Delivery Deadline Validation');

    // Setup product with stock
    const testProduct = await prisma.product.create({
      data: {
        code: `PROD-TEST-${timestamp}`,
        name: `Indigo Denim ${timestamp}`,
        type: 'FINISHED_GOODS',
        category: 'Fabric',
        unit: 'METER',
        currentStock: 200.0, // 200 meters available
        minimumStock: 50.0,
        unitCost: 300.0
      }
    });

    // 2a. Reject yesterday
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const resPast = await makeRequest(port, 'POST', '/api/sales/orders', {
      customerId: validBuyerId,
      deliveryDeadline: yesterday,
      items: [{ productId: testProduct.id, quantity: 120.0, unitPrice: 400.0 }]
    });
    assert(resPast.status === 400, 'Rejects yesterday as delivery deadline with 400 Bad Request');

    // 2b. Accept future date
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const validSoRes = await makeRequest(port, 'POST', '/api/sales/orders', {
      customerId: validBuyerId,
      deliveryDeadline: futureDate,
      items: [{ productId: testProduct.id, fabricType: 'Indigo Denim', quantity: 120.0, unitPrice: 400.0 }]
    });
    assert(validSoRes.status === 201, 'Accepts future delivery deadline with 201 Created');
    const createdSalesOrder = validSoRes.data.data;
    assert(createdSalesOrder.orderNumber !== undefined, 'Sales Order generated with orderNumber');

    // -------------------------------------------------------------
    // TEST 3: Inventory Edit (Arbitrary stock overwrite disallowed)
    // -------------------------------------------------------------
    console.log('\nTEST 3: Inventory Master Edit Rules');
    const updateRes = await makeRequest(port, 'PUT', `/api/inventory/products/${testProduct.id}`, {
      name: `Indigo Denim Updated ${timestamp}`,
      currentStock: 9999.0 // attempting arbitrary stock overwrite
    });
    assert(updateRes.status === 200, 'Product master metadata update succeeds');
    
    // Verify in database that stock remains 200.0 (not 9999.0)
    const refreshedProduct = await prisma.product.findUnique({ where: { id: testProduct.id } });
    assert(refreshedProduct.currentStock === 200.0, 'Stock quantity was NOT arbitrarily overwritten (remains 200.0)');
    assert(refreshedProduct.name === `Indigo Denim Updated ${timestamp}`, 'Permitted master fields updated properly');

    // -------------------------------------------------------------
    // TEST 4: Dispatch Workflow & Stock Deduction
    // -------------------------------------------------------------
    console.log('\nTEST 4: Dispatch Workflow & Single Stock Deduction');

    // 4a. Verify eligible orders endpoint displays this order
    const eligibleRes = await makeRequest(port, 'GET', '/api/dispatch/eligible-orders');
    assert(eligibleRes.status === 200, 'GET /api/dispatch/eligible-orders returns 200 OK');
    const isPresent = eligibleRes.data.data.some((o) => o.id === createdSalesOrder.id);
    assert(isPresent, 'Created sales order is displayed in eligible dispatch orders');

    // 4b. Confirm Dispatch
    const dispatchRes = await makeRequest(port, 'POST', '/api/dispatch', {
      salesOrderId: createdSalesOrder.id,
      vehicleNumber: 'GJ-05-AB-1234',
      driverName: 'Mohan Kumar',
      driverPhone: '9825144550',
      destination: 'Surat Garment Hub',
      dispatchedRollCount: 2
    });
    assert(dispatchRes.status === 201, 'POST /api/dispatch creates and confirms dispatch with 201 Created');
    const dispatchRecord = dispatchRes.data.data;
    assert(dispatchRecord.dispatchNumber.startsWith('DSP-'), 'Generated valid dispatchNumber');
    assert(dispatchRecord.status === 'DISPATCHED', 'Dispatch status is DISPATCHED');

    // 4c. Verify Stock Deduction in Database
    const stockAfterDispatch = (await prisma.product.findUnique({ where: { id: testProduct.id } })).currentStock;
    assert(stockAfterDispatch === 80.0, 'Warehouse stock deducted exactly once: 200.0 - 120.0 = 80.0 METER');

    // 4d. Verify Sales Order Status in Database
    const soAfterDispatch = await prisma.salesOrder.findUnique({ where: { id: createdSalesOrder.id } });
    assert(soAfterDispatch.status === 'DISPATCHED', 'Sales order status transitioned to DISPATCHED');

    // 4e. Verify Inventory Transaction logged
    const txLog = await prisma.inventoryTransaction.findFirst({
      where: { productId: testProduct.id, type: 'DISPATCH' }
    });
    assert(txLog !== null, 'InventoryTransaction logged for DISPATCH');
    assert(txLog.quantity === -120.0, 'InventoryTransaction quantity is -120.0');

    // 4f. Repeat Dispatch Confirmation (Must be refused with 409 Conflict, NO double deduction)
    console.log('\nTEST 4f: Prevent Duplicate Dispatch & Double Stock Deduction');
    const repeatDispatchRes = await makeRequest(port, 'POST', '/api/dispatch', {
      salesOrderId: createdSalesOrder.id,
      vehicleNumber: 'GJ-05-AB-1234',
      destination: 'Surat Garment Hub'
    });
    assert(repeatDispatchRes.status === 409, 'Repeat dispatch rejected with 409 Conflict (Duplicate prohibited)');

    // Verify stock was NOT deducted again
    const stockAfterRepeat = (await prisma.product.findUnique({ where: { id: testProduct.id } })).currentStock;
    assert(stockAfterRepeat === 80.0, 'Stock remained at 80.0 METER (Double deduction prevented)');

    // 4g. Insufficient Stock Dispatch Attempt
    console.log('\nTEST 4g: Reject Dispatch when Stock is Insufficient');
    // Create new SO for 150m (but only 80m left in warehouse)
    const shortageSoRes = await makeRequest(port, 'POST', '/api/sales/orders', {
      customerId: validBuyerId,
      deliveryDeadline: futureDate,
      items: [{ productId: testProduct.id, quantity: 150.0, unitPrice: 400.0 }]
    });
    const shortageSoId = shortageSoRes.data.data.id;

    const shortageDispatchRes = await makeRequest(port, 'POST', '/api/dispatch', {
      salesOrderId: shortageSoId,
      vehicleNumber: 'MH-04-XY-9999',
      destination: 'Mumbai Port'
    });
    assert(shortageDispatchRes.status === 409, 'Dispatch with insufficient stock rejected with 409 Conflict');

    // Clean up test records
    await prisma.dispatchRecord.deleteMany({ where: { salesOrderId: createdSalesOrder.id } });
    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: { in: [createdSalesOrder.id, shortageSoId] } } });
    await prisma.salesOrder.deleteMany({ where: { id: { in: [createdSalesOrder.id, shortageSoId] } } });
    await prisma.inventoryTransaction.deleteMany({ where: { productId: testProduct.id } });
    await prisma.product.delete({ where: { id: testProduct.id } });
    await prisma.customer.delete({ where: { id: validBuyerId } });

    console.log('\n🎉 ALL BUSINESS RULES & DISPATCH ACCEPTANCE TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runAcceptanceTests();
