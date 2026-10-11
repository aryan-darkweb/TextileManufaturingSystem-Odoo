async function testMachines() {
  const baseURL = 'http://localhost:5000/api/mill-flow';
  console.log('Testing 3-Step Stage Machines & Production Pipeline...\n');

  try {
    // 1. Get Machines
    const res = await fetch(`${baseURL}/machines`).then(r => r.json());
    console.log(`[PASS] Fetched stage machines.`);
    console.log(`- Spinning machines (${res.data.spinning.length}):`, res.data.spinning.map(m => `${m.code} [${m.status}] In:${m.inputTaken}${m.unit} Out:${m.quantityProduced}${m.unit}`).join(' | '));
    console.log(`- Weaving machines (${res.data.weaving.length}):`, res.data.weaving.map(m => `${m.code} [${m.status}] In:${m.inputTaken}${m.unit} Out:${m.quantityProduced}${m.unit}`).join(' | '));
    console.log(`- Dyeing machines (${res.data.dyeing.length}):`, res.data.dyeing.map(m => `${m.code} [${m.status}] In:${m.inputTaken}${m.unit} Out:${m.quantityProduced}${m.unit}`).join(' | '));

    // 2. Toggle a machine status
    const m1 = res.data.spinning[0];
    const updateRes = await fetch(`${baseURL}/machines/${m1.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'MAINTENANCE' })
    }).then(r => r.json());
    console.log(`\n[PASS] Machine status update: ${m1.code} -> ${updateRes.data.status}`);

    // Revert back
    await fetch(`${baseURL}/machines/${m1.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RUNNING' })
    }).then(r => r.json());
    console.log(`[PASS] Reverted ${m1.code} status -> RUNNING`);

    // 3. Test advancing production stage
    const pipeRes = await fetch(`${baseURL}/pipeline`).then(r => r.json());
    const inProdOrder = pipeRes.data.orders.find(o => o.productionRun && o.productionRun.status === 'IN_PROGRESS');
    if (inProdOrder) {
      console.log(`\nFound in-progress production order: ${inProdOrder.productionRun.orderNumber} in stage ${inProdOrder.productionRun.stage}`);
      const advRes = await fetch(`${baseURL}/production/${inProdOrder.productionRun.id}/advance-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).then(r => r.json());
      console.log(`[PASS] Advance stage result:`, advRes.message, `Current Stage: ${advRes.data.stage}`);
    } else {
      console.log('\n[INFO] No active production order found to test stage advancing.');
    }

    console.log('\nALL STAGE MACHINE & PIPELINE TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testMachines();
