const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAndSeedDatabase() {
  console.log('====================================================');
  console.log('RESETTING TEXTILEFLOW DATABASE & SEEDING MILL MODEL');
  console.log('====================================================');

  // 1. Truncate / delete all records in strict foreign key order
  console.log('\n[1/4] Clearing all existing transactional & master records...');
  await prisma.defectRecord.deleteMany({});
  await prisma.qualityInspection.deleteMany({});
  await prisma.productionStageLog.deleteMany({});
  await prisma.materialConsumption.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.dispatchRecord.deleteMany({});
  await prisma.buyerPayment.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.supplierPayment.deleteMany({});
  await prisma.supplierBillItem.deleteMany({});
  await prisma.supplierBill.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.product.deleteMany({});
  console.log('  -> All old records purged from Supabase successfully.');

  // Ensure default mill machines exist
  const existingMachines = await prisma.machine.count();
  if (existingMachines === 0) {
    console.log('  -> Seeding mill floor machines...');
    await prisma.machine.createMany({
      data: [
        { code: 'MCH-SPN-01', name: 'Rieter Ring Spinning Frame G38', type: 'SPINNING', status: 'RUNNING', capacity: 2500, unit: 'KG_PER_DAY', location: 'Hall A' },
        { code: 'MCH-SPN-02', name: 'Murata Vortex Spinning Machine 870', type: 'SPINNING', status: 'RUNNING', capacity: 3000, unit: 'KG_PER_DAY', location: 'Hall A' },
        { code: 'MCH-WVG-01', name: 'Picanol OmniPlus-i Airjet Loom 01', type: 'WEAVING', status: 'RUNNING', capacity: 1800, unit: 'METER_PER_DAY', location: 'Shed 1' },
        { code: 'MCH-WVG-02', name: 'Toyota JAT810 Airjet Loom 02', type: 'WEAVING', status: 'RUNNING', capacity: 2000, unit: 'METER_PER_DAY', location: 'Shed 1' },
        { code: 'MCH-WVG-03', name: 'Itema R9500-2 Rapier Weaving Loom', type: 'WEAVING', status: 'IDLE', capacity: 1500, unit: 'METER_PER_DAY', location: 'Shed 2' },
        { code: 'MCH-DYE-01', name: 'Fong High Temperature Soft Dyeing Jet', type: 'DYEING', status: 'RUNNING', capacity: 1200, unit: 'KG_PER_DAY', location: 'Wet Processing' },
        { code: 'MCH-FNS-01', name: 'Monforts Montex 8500 Stenter Finisher', type: 'FINISHING', status: 'RUNNING', capacity: 3500, unit: 'METER_PER_DAY', location: 'Finishing Hall' }
      ]
    });
  }

  // 2. Seed 10 Yarns and 10 Respective Fabrics
  console.log('\n[2/4] Seeding 10 Yarns & 10 Respective Fabrics...');

  const yarnConfigs = [
    { code: 'YRN-COT-30', name: '30s Combed Cotton Cone Yarn', category: 'Cotton Yarn', unit: 'KG', stock: 4500, minStock: 800, cost: 260, color: 'Natural White', specs: 'Count: 30s Ne, 100% Combed Cotton' },
    { code: 'YRN-COT-40', name: '40s Carded Ring Spun Cotton Yarn', category: 'Cotton Yarn', unit: 'KG', stock: 5200, minStock: 1000, cost: 290, color: 'Raw Ecru', specs: 'Count: 40s Ne, Ring Spun' },
    { code: 'YRN-COT-60', name: '60s Super Compact Cotton Yarn', category: 'Cotton Yarn', unit: 'KG', stock: 3800, minStock: 600, cost: 380, color: 'Bleached White', specs: 'Count: 60s Compact Ne, Long Staple' },
    { code: 'YRN-PLY-150', name: '150D/48F Textured Polyester Filament', category: 'Synthetic Yarn', unit: 'KG', stock: 6000, minStock: 1200, cost: 145, color: 'Bright White', specs: '150 Denier / 48 Filaments' },
    { code: 'YRN-LIN-40', name: '2/40s Pure European Flax Linen Yarn', category: 'Linen Yarn', unit: 'KG', stock: 2400, minStock: 500, cost: 620, color: 'Natural Flax', specs: '2/40s Lea, 100% European Flax' },
    { code: 'YRN-MOD-80', name: '80s Micro-Modal Eco-Blend Yarn', category: 'Cellulosic Yarn', unit: 'KG', stock: 3100, minStock: 500, cost: 440, color: 'Soft Ivory', specs: '80s Modal Micro, Lenzing Grade' },
    { code: 'YRN-VIS-30', name: '30s High-Tenacity Viscose Rayon Yarn', category: 'Viscose Yarn', unit: 'KG', stock: 4800, minStock: 800, cost: 210, color: 'Semi-Dull', specs: '30s Viscose Staple Fiber' },
    { code: 'YRN-SLK-22', name: '100% Pure Mulberry Silk Filament 20/22D', category: 'Silk Yarn', unit: 'KG', stock: 850, minStock: 150, cost: 1850, color: 'Gold Raw Silk', specs: 'Mulberry Grade 4A, 20/22 Denier' },
    { code: 'YRN-DNM-10', name: '10s Indigo Slub Open-End Denim Yarn', category: 'Denim Yarn', unit: 'KG', stock: 7500, minStock: 1500, cost: 230, color: 'Deep Indigo', specs: '10s Slub Open-End Rotor' },
    { code: 'YRN-SPX-70', name: '70D Spandex Core-Spun Stretch Yarn', category: 'Stretch Yarn', unit: 'KG', stock: 3500, minStock: 700, cost: 320, color: 'Optic White', specs: '70 Denier Elastane Core-Spun' }
  ];

  const createdYarns = [];
  for (const y of yarnConfigs) {
    const p = await prisma.product.create({
      data: {
        code: y.code,
        name: y.name,
        type: 'RAW_MATERIAL',
        category: y.category,
        unit: y.unit,
        currentStock: y.stock,
        minimumStock: y.minStock,
        unitCost: y.cost,
        color: y.color,
        specifications: y.specs,
        status: 'ACTIVE'
      }
    });
    createdYarns.push(p);
  }
  console.log(`  -> Created ${createdYarns.length} Raw Material Yarns.`);

  // 10 Respective Fabrics (each with its specific yarn conversion ratio)
  const fabricConfigs = [
    { code: 'FAB-CAM-101', name: '100% Pure Cotton Cambric Shirting', yarnIdx: 0, ratio: 1.15, cost: 480, stock: 1200, color: 'Pure White', specs: 'Width: 58 inch, GSM: 110, Cambric Weave' },
    { code: 'FAB-POP-102', name: 'Fine Cotton Poplin Apparel Fabric', yarnIdx: 1, ratio: 1.25, cost: 540, stock: 950, color: 'Sky Blue', specs: 'Width: 56 inch, GSM: 130, Plain Poplin' },
    { code: 'FAB-SAT-103', name: 'Luxury 300TC Cotton Satin Sheeting', yarnIdx: 2, ratio: 1.40, cost: 720, stock: 800, color: 'Cream Gold', specs: 'Width: 108 inch, GSM: 145, Sateen Stripe' },
    { code: 'FAB-PVS-104', name: 'Wrinkle-Free Poly-Viscose Suiting', yarnIdx: 3, ratio: 1.10, cost: 360, stock: 1500, color: 'Charcoal Grey', specs: 'Width: 58 inch, GSM: 220, Twill Suiting' },
    { code: 'FAB-LIN-105', name: 'Organic Pure Linen Breathable Shirting', yarnIdx: 4, ratio: 1.35, cost: 1250, stock: 650, color: 'Natural Oatmeal', specs: 'Width: 54 inch, GSM: 160, Slub Linen Weave' },
    { code: 'FAB-JER-106', name: 'Silky Soft Micro-Modal Single Jersey', yarnIdx: 5, ratio: 1.20, cost: 890, stock: 1100, color: 'Lavender Mist', specs: 'Width: 60 inch, GSM: 180, Circular Knit Jersey' },
    { code: 'FAB-VIS-107', name: 'Printed Viscose Crepe Dress Fabric', yarnIdx: 6, ratio: 1.18, cost: 430, stock: 1350, color: 'Floral Magenta', specs: 'Width: 44 inch, GSM: 115, High Twist Crepe' },
    { code: 'FAB-SLK-108', name: 'Handloom Royal Mulberry Silk Dupioni', yarnIdx: 7, ratio: 0.95, cost: 3400, stock: 420, color: 'Royal Peacock', specs: 'Width: 48 inch, GSM: 95, Authentic Dupioni' },
    { code: 'FAB-DNM-109', name: '14.5oz Heavy Rugged Indigo Denim Twill', yarnIdx: 8, ratio: 1.85, cost: 620, stock: 2200, color: 'Raw Deep Indigo', specs: 'Width: 62 inch, GSM: 450, 3/1 Right Hand Twill' },
    { code: 'FAB-STR-110', name: 'Flexible Stretch Twill Chino Fabric', yarnIdx: 9, ratio: 1.30, cost: 680, stock: 1400, color: 'Khaki Sand', specs: 'Width: 58 inch, GSM: 240, 2/1 Stretch Twill' }
  ];

  const createdFabrics = [];
  for (const f of fabricConfigs) {
    const parentYarn = createdYarns[f.yarnIdx];
    const specData = JSON.stringify({
      yarnCode: parentYarn.code,
      yarnName: parentYarn.name,
      yarnRatio: f.ratio,
      weave: f.specs
    });

    const p = await prisma.product.create({
      data: {
        code: f.code,
        name: f.name,
        type: 'FINISHED_GOODS',
        category: 'Finished Fabric',
        unit: 'METER',
        currentStock: f.stock,
        minimumStock: 200,
        unitCost: f.cost,
        color: f.color,
        specifications: specData,
        status: 'ACTIVE'
      }
    });
    createdFabrics.push({ fabric: p, yarn: parentYarn, ratio: f.ratio });
  }
  console.log(`  -> Created ${createdFabrics.length} Respective Finished Fabrics with specific conversion recipes.`);

  // 3. Seed 7 Trusted Suppliers and 10 Pre-Trusted Buyers
  console.log('\n[3/4] Seeding 7 Trusted Suppliers & 10 Pre-Trusted Buyers...');

  const supplierConfigs = [
    { name: 'Vardhman Spinning Mills Ltd', contact: 'Rajeshwar Oswal', phone: '+91 98141 23450', email: 'orders@vardhman.com', address: 'Chandigarh Road, Ludhiana, Punjab', types: 'Combed Cotton, Compact Yarns (YRN-COT-30, YRN-COT-60)' },
    { name: 'Trident Group Textile Division', contact: 'Sunil Mittal', phone: '+91 98765 43210', email: 'yarnsales@tridentindia.com', address: 'Trident Complex, Raikot Road, Barnala, Punjab', types: 'Carded Cotton & Open End Yarns (YRN-COT-40)' },
    { name: 'KPR Mill Spinners Ltd', contact: 'K. P. Ramasamy', phone: '+91 94432 11223', email: 'dispatch@kprmill.com', address: 'Gokul Buildings, Avinashi Road, Tirupur, Tamil Nadu', types: 'Weaving & Knitting Grade Cotton Cones' },
    { name: 'RSWM Limited (LNJ Bhilwara Group)', contact: 'Riju Jhunjhunwala', phone: '+91 98290 88776', email: 'sales@rswm.in', address: 'Kharigram, Post Gulabpura, Bhilwara, Rajasthan', types: 'Poly-Viscose & Synthetic Filaments (YRN-PLY-150, YRN-VIS-30)' },
    { name: 'Nahar Spinning Mills Ltd', contact: 'Dinesh Oswal', phone: '+91 98150 99887', email: 'yarn@owmnahar.com', address: 'Industrial Area A, Ludhiana, Punjab', types: 'Modal Micro Eco-Blends (YRN-MOD-80)' },
    { name: 'Arvind Yarns & Raw Cotton', contact: 'Sanjay Lalbhai', phone: '+91 98250 11223', email: 'cottonyarn@arvind.in', address: 'Naroda Road, Ahmedabad, Gujarat', types: 'Denim Slub & Stretch Core Spun (YRN-DNM-10, YRN-SPX-70)' },
    { name: 'Nitin Spinners Limited', contact: 'R. L. Nolkha', phone: '+91 98291 33445', email: 'supplies@nitinspinners.com', address: 'Hamirgarh, Bhilwara, Rajasthan', types: 'Pure European Linen & Silk Filaments (YRN-LIN-40, YRN-SLK-22)' }
  ];

  const createdSuppliers = [];
  for (const s of supplierConfigs) {
    const sup = await prisma.supplier.create({
      data: {
        name: s.name,
        contactPerson: s.contact,
        phone: s.phone,
        email: s.email,
        address: s.address,
        yarnTypesSupplied: s.types
      }
    });
    createdSuppliers.push(sup);
  }
  console.log(`  -> Created ${createdSuppliers.length} Trusted Yarn Suppliers.`);

  const buyerConfigs = [
    { name: 'Raymond Apparel Limited', company: 'Raymond Group', contact: 'Gautam Singhania', phone: '+91 98200 11220', email: 'procurement@raymond.in', address: 'Jekegram, Pokhran Road No 1, Thane West, Mumbai' },
    { name: 'Aditya Birla Fashion & Retail Ltd', company: 'ABFRL (Van Heusen / Louis Philippe)', contact: 'Ashish Dikshit', phone: '+91 98450 33445', email: 'fabrics@abfrl.adityabirla.com', address: 'Piramal Agastya Park, Kurla West, Mumbai' },
    { name: 'Arvind Lifestyle Brands Ltd', company: 'Arvind Fashions', contact: 'Shailesh Chaturvedi', phone: '+91 98451 99880', email: 'sourcing@arvindbrands.com', address: 'Du Parc Trinity, MG Road, Bengaluru, Karnataka' },
    { name: 'FabIndia Overseas Pvt Ltd', company: 'FabIndia Ethnic Retail', contact: 'William Bissell', phone: '+91 98110 55443', email: 'textiles@fabindia.net', address: 'Plot 10, Local Shopping Centre, Nelson Mandela Marg, New Delhi' },
    { name: 'Zara India (Inditex Trent Retail)', company: 'Inditex Group India', contact: 'Andrea Rossi', phone: '+91 98201 66778', email: 'vendor.india@inditex.com', address: 'Bandra Kurla Complex (BKC), Bandra East, Mumbai' },
    { name: 'Page Industries Ltd (Jockey India)', company: 'Page Industries', contact: 'V. S. Ganesh', phone: '+91 98452 77889', email: 'millsourcing@jockeyindia.com', address: 'Cessna Business Park, Kadubeesanahalli, Bengaluru' },
    { name: 'Reliance Retail - Trends Division', company: 'Reliance Retail Ltd', contact: 'Akhilesh Prasad', phone: '+91 98205 44332', email: 'apparel.sourcing@ril.com', address: 'Reliance Corporate Park, Ghansoli, Navi Mumbai' },
    { name: 'Shahi Exports Private Limited', company: 'Shahi Exports (Garment Export)', contact: 'Harish Ahuja', phone: '+91 98100 22334', email: 'materials@shahi.co.in', address: 'Industrial Plot 1, Mathura Road, Faridabad, Haryana' },
    { name: 'Gokaldas Exports Limited', company: 'Gokaldas Exports', contact: 'Sivaramakrishnan Ganapathi', phone: '+91 98453 88990', email: 'fabricpurchases@gokaldasexports.com', address: 'Industrial Suburb, Yeshwanthpur, Bengaluru' },
    { name: 'The Bombay Dyeing & Mfg Co Ltd', company: 'Wadia Group Textiles', contact: 'Nusli Wadia', phone: '+91 98202 33445', email: 'textileoperations@bombaydyeing.com', address: 'Neville House, JN Heredia Marg, Ballard Estate, Mumbai' }
  ];

  const createdBuyers = [];
  for (const b of buyerConfigs) {
    const cust = await prisma.customer.create({
      data: {
        name: b.name,
        companyName: b.company,
        email: b.email,
        phone: b.phone,
        address: b.address
      }
    });
    createdBuyers.push(cust);
  }
  console.log(`  -> Created ${createdBuyers.length} Pre-Trusted Buyers.`);

  // 4. Perform 100 Realistic Random Transactions across a complete mill cycle
  console.log('\n[4/4] Generating 100 Transactions across the complete mill cycle...');

  let txCounter = 0;
  const now = Date.now();
  const dayMs = 86400000;

  // Set A: 20 Inward Yarn Purchases from Suppliers (PO -> Bill -> Supplier Payment -> Inventory Inward)
  console.log('  -> Creating 20 Inward Yarn Purchases (POs, Bills, Settlements)...');
  for (let i = 0; i < 20; i++) {
    const supplier = createdSuppliers[i % createdSuppliers.length];
    const yarn = createdYarns[i % createdYarns.length];
    const qty = 200 + (i * 35) % 500;
    const unitPrice = yarn.unitCost;
    const totalAmount = qty * unitPrice;
    const dateOffset = (55 - (i * 2.5)) * dayMs;
    const orderDate = new Date(now - dateOffset);

    const poNumber = `PO-2026-${String(i + 1).padStart(4, '0')}`;
    const po = await prisma.purchaseOrder.create({
      data: {
        orderNumber: poNumber,
        supplierId: supplier.id,
        status: 'RECEIVED',
        orderDate,
        expectedDeliveryDate: new Date(orderDate.getTime() + 5 * dayMs),
        totalAmount,
        notes: `Inward procurement of ${yarn.name} from ${supplier.name}`,
        items: {
          create: [{
            productId: yarn.id,
            orderedQty: qty,
            receivedQty: qty,
            unitPrice,
            totalPrice: totalAmount
          }]
        }
      }
    });

    // Inward stock transaction
    await prisma.inventoryTransaction.create({
      data: {
        productId: yarn.id,
        type: 'PURCHASE_RECEIPT',
        quantity: qty,
        balanceAfter: yarn.currentStock,
        referenceNumber: poNumber,
        notes: `Goods received from ${supplier.name}`,
        performedBy: 'Inward Warehouse Gate',
        createdAt: orderDate
      }
    });

    // Supplier Bill
    const billNumber = `BILL-PO-2026-${String(i + 1).padStart(4, '0')}`;
    const bill = await prisma.supplierBill.create({
      data: {
        billNumber,
        supplierId: supplier.id,
        purchaseOrderId: po.id,
        billDate: orderDate,
        dueDate: new Date(orderDate.getTime() + 30 * dayMs),
        status: 'PAID',
        totalAmount,
        paidAmount: totalAmount,
        balanceDue: 0,
        notes: `Invoice for raw yarn received on ${orderDate.toLocaleDateString()}`
      }
    });

    // Supplier Settlement Payment
    await prisma.supplierPayment.create({
      data: {
        paymentNumber: `SPAY-2026-${String(i + 1).padStart(4, '0')}`,
        billId: bill.id,
        paymentDate: new Date(orderDate.getTime() + 2 * dayMs),
        amount: totalAmount,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: `NEFT-SUP-${String(i + 1).padStart(4, '0')}`,
        notes: `Settled via bank transfer to ${supplier.name}`
      }
    });

    txCounter += 4; // PO, InvTx, Bill, Payment
  }

  // Set B: 20 Full Buyer Cycles (Sales Order -> Production -> QC -> Dispatch -> Invoice -> Payment)
  console.log('  -> Creating 20 Complete Finished Fabric Buyer Cycles...');
  for (let i = 0; i < 20; i++) {
    const buyer = createdBuyers[i % createdBuyers.length];
    const fabricPair = createdFabrics[i % createdFabrics.length];
    const fabric = fabricPair.fabric;
    const yarn = fabricPair.yarn;
    const ratio = fabricPair.ratio;

    const fabricQty = 25 + (i * 15) % 150; // meters
    const yarnNeeded = Math.round(fabricQty * ratio * 10) / 10; // KG
    const fabricPrice = fabric.unitCost;
    const totalSalesAmount = fabricQty * fabricPrice;

    const dateOffset = (45 - (i * 2)) * dayMs;
    const orderDate = new Date(now - dateOffset);

    // 1. Sales Order
    const soNumber = `SO-2026-${String(i + 1).padStart(4, '0')}`;
    const so = await prisma.salesOrder.create({
      data: {
        orderNumber: soNumber,
        customerId: buyer.id,
        status: 'COMPLETED',
        orderDate,
        deliveryDeadline: new Date(orderDate.getTime() + 7 * dayMs),
        notes: `yarnRatio:${ratio} | yarnId:${yarn.id} | Contract with ${buyer.name}`,
        items: {
          create: [{
            productId: fabric.id,
            fabricType: fabric.name,
            color: fabric.color,
            quantity: fabricQty,
            unitPrice: fabricPrice,
            totalPrice: totalSalesAmount
          }]
        }
      }
    });

    // 2. Production Order & Yarn Consumption
    const prodNumber = `PROD-2026-${String(i + 1).padStart(4, '0')}`;
    const prod = await prisma.productionOrder.create({
      data: {
        orderNumber: prodNumber,
        salesOrderId: so.id,
        productId: fabric.id,
        stage: 'FINISHING',
        status: 'COMPLETED',
        targetQuantity: fabricQty,
        producedQuantity: fabricQty,
        startDate: orderDate,
        endDate: new Date(orderDate.getTime() + 3 * dayMs),
        materialConsumptions: {
          create: [{
            rawMaterialId: yarn.id,
            stage: 'WEAVING',
            plannedQuantity: yarnNeeded,
            actualQuantity: yarnNeeded,
            unit: yarn.unit,
            isDeducted: true
          }]
        },
        stageLogs: {
          create: [{
            stage: 'WEAVING',
            inputQuantity: yarnNeeded,
            outputQuantity: fabricQty,
            wasteQuantity: 0,
            status: 'COMPLETED',
            startedAt: orderDate,
            completedAt: new Date(orderDate.getTime() + 3 * dayMs)
          }]
        }
      }
    });

    // Yarn deduction log
    await prisma.inventoryTransaction.create({
      data: {
        productId: yarn.id,
        type: 'PRODUCTION_CONSUMPTION',
        quantity: -yarnNeeded,
        balanceAfter: yarn.currentStock,
        referenceNumber: prodNumber,
        notes: `Consumed for production of ${soNumber}`,
        performedBy: 'Loom Operator',
        createdAt: orderDate
      }
    });

    // 3. Quality Inspection (PASSED)
    const rollNumber = `ROLL-${prodNumber}-01`;
    await prisma.qualityInspection.create({
      data: {
        rollNumber,
        productionOrderId: prod.id,
        metersInspected: fabricQty,
        defectType: 'NONE',
        defectSeverity: 'MINOR',
        status: 'PASSED',
        inspectorName: 'Devraj Sen (QC Lead)',
        notes: 'Fabric inspected and cleared for dispatch',
        inspectedAt: new Date(orderDate.getTime() + 3 * dayMs)
      }
    });

    // Finished fabric stock receipt
    await prisma.inventoryTransaction.create({
      data: {
        productId: fabric.id,
        type: 'PRODUCTION_OUTPUT',
        quantity: fabricQty,
        balanceAfter: fabric.currentStock,
        referenceNumber: prodNumber,
        notes: `Finished fabric produced and passed QC for ${soNumber}`,
        performedBy: 'QC Lead',
        createdAt: new Date(orderDate.getTime() + 3 * dayMs)
      }
    });

    // 4. Dispatch & Gate Pass
    const dspNumber = `DSP-2026-${String(i + 1).padStart(4, '0')}`;
    await prisma.dispatchRecord.create({
      data: {
        dispatchNumber: dspNumber,
        salesOrderId: so.id,
        vehicleNumber: `MH-${12 + (i % 8)}-TX-${4000 + i}`,
        driverName: ['Ramesh Shinde', 'Jagjit Singh', 'Manoj Patil', 'Suresh Yadav'][i % 4],
        driverPhone: `+91 9822${String(10000 + i).slice(-6)}`,
        destination: buyer.address || 'Buyer Central Warehouse',
        dispatchedRollCount: 1,
        status: 'DELIVERED',
        dispatchedAt: new Date(orderDate.getTime() + 4 * dayMs)
      }
    });

    // Fabric stock deduction on dispatch
    await prisma.inventoryTransaction.create({
      data: {
        productId: fabric.id,
        type: 'DISPATCH',
        quantity: -fabricQty,
        balanceAfter: fabric.currentStock,
        referenceNumber: dspNumber,
        notes: `Dispatched to ${buyer.name}`,
        performedBy: 'Gate Security',
        createdAt: new Date(orderDate.getTime() + 4 * dayMs)
      }
    });

    // 5. Commercial Invoice & Buyer Payment (Inflow)
    const invNumber = `INV-2026-${String(i + 1).padStart(4, '0')}`;
    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: invNumber,
        salesOrderId: so.id,
        customerId: buyer.id,
        issueDate: new Date(orderDate.getTime() + 4 * dayMs),
        dueDate: new Date(orderDate.getTime() + 20 * dayMs),
        status: 'PAID',
        subtotal: totalSalesAmount,
        taxAmount: 0,
        totalAmount: totalSalesAmount,
        paidAmount: totalSalesAmount,
        balanceDue: 0,
        notes: `Commercial invoice for fabric delivery ${dspNumber}`
      }
    });

    await prisma.buyerPayment.create({
      data: {
        paymentNumber: `PAY-2026-${String(i + 1).padStart(4, '0')}`,
        invoiceId: inv.id,
        paymentDate: new Date(orderDate.getTime() + 5 * dayMs),
        amount: totalSalesAmount,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: `UTR-BUY-${String(i + 1).padStart(4, '0')}`,
        notes: `Payment cleared from ${buyer.name}`
      }
    });

    txCounter += 8; // SO, ProdOrder, YarnTx, QC, FabricInTx, Dispatch, FabricOutTx, Invoice, Payment
  }

  // Set C: 5 Defective Runs with Reruns (Testing Defect Accounting & Wasted Yarn)
  console.log('  -> Creating 5 Defective Runs (Wasted Yarn & Reruns)...');
  for (let i = 0; i < 5; i++) {
    const buyer = createdBuyers[(i + 5) % createdBuyers.length];
    const fabricPair = createdFabrics[(i + 3) % createdFabrics.length];
    const fabric = fabricPair.fabric;
    const yarn = fabricPair.yarn;
    const ratio = fabricPair.ratio;
    const fabricQty = 40;
    const yarnWasted = Math.round(fabricQty * ratio);
    const dateOffset = (15 - i * 2) * dayMs;
    const orderDate = new Date(now - dateOffset);

    const soNumber = `SO-2026-${String(21 + i).padStart(4, '0')}`;
    const so = await prisma.salesOrder.create({
      data: {
        orderNumber: soNumber,
        customerId: buyer.id,
        status: 'IN_PRODUCTION',
        orderDate,
        deliveryDeadline: new Date(orderDate.getTime() + 5 * dayMs),
        notes: `Defective run testing | yarnRatio:${ratio} | yarnId:${yarn.id}`,
        items: {
          create: [{
            productId: fabric.id,
            fabricType: fabric.name,
            color: fabric.color || 'Standard',
            quantity: fabricQty,
            unitPrice: fabric.unitCost,
            totalPrice: fabricQty * fabric.unitCost
          }]
        }
      }
    });

    const prod = await prisma.productionOrder.create({
      data: {
        orderNumber: `PROD-2026-${String(21 + i).padStart(4, '0')}`,
        salesOrderId: so.id,
        productId: fabric.id,
        stage: 'WEAVING',
        status: 'PAUSED',
        targetQuantity: fabricQty,
        producedQuantity: 0,
        startDate: orderDate,
        materialConsumptions: {
          create: [{
            rawMaterialId: yarn.id,
            stage: 'WEAVING',
            plannedQuantity: yarnWasted,
            actualQuantity: yarnWasted,
            unit: yarn.unit,
            isDeducted: true
          }]
        }
      }
    });

    // Deduct wasted yarn
    await prisma.inventoryTransaction.create({
      data: {
        productId: yarn.id,
        type: 'PRODUCTION_CONSUMPTION',
        quantity: -yarnWasted,
        balanceAfter: yarn.currentStock,
        referenceNumber: prod.orderNumber,
        notes: `Wasted in defective weaving run (₹0 revenue)`,
        performedBy: 'Loom Master',
        createdAt: orderDate
      }
    });

    const defectTypes = ['HOLES', 'COLOR_MISMATCH', 'UNEVEN_WEAVING', 'STAIN', 'OTHER'];
    const insp = await prisma.qualityInspection.create({
      data: {
        rollNumber: `ROLL-DEFECT-${String(i + 1).padStart(3, '0')}`,
        productionOrderId: prod.id,
        metersInspected: fabricQty,
        defectType: defectTypes[i % defectTypes.length],
        defectSeverity: 'MAJOR',
        status: 'REJECTED',
        inspectorName: 'Kavita Joshi (Senior QC)',
        notes: `Defect observed: ${defectTypes[i % defectTypes.length]}. Fabric scrapped.`,
        inspectedAt: new Date(orderDate.getTime() + 1 * dayMs)
      }
    });

    await prisma.defectRecord.create({
      data: {
        inspectionId: insp.id,
        defectType: defectTypes[i % defectTypes.length],
        severity: 'MAJOR',
        defectQty: 2,
        location: 'Meter 18 to 24',
        notes: 'Excessive tension variation causing severe warp streak'
      }
    });

    txCounter += 5;
  }

  console.log(`\n====================================================`);
  console.log(`DATABASE SEED COMPLETE!`);
  console.log(`Master Data:`);
  console.log(`  - 10 Random Yarns (Raw Material)`);
  console.log(`  - 10 Respective Finished Fabrics with specific recipes`);
  console.log(`  - 7 Trusted Yarn Suppliers`);
  console.log(`  - 10 Pre-Trusted Fabric Buyers`);
  console.log(`  - ${txCounter}+ Total Balanced Transactions across all cycles.`);
  console.log(`====================================================`);
}

resetAndSeedDatabase()
  .catch((err) => {
    console.error('Seed Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
