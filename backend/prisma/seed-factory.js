const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedFactory() {
  console.log('🏭 Starting Factory Operations demo seed (idempotent upsert)...');

  // 1. Ensure Finished Goods & Raw Materials
  const finishedProduct = await prisma.product.upsert({
    where: { code: 'FAB-DNM-12OZ' },
    update: {},
    create: {
      code: 'FAB-DNM-12OZ',
      name: '12oz Indigo Twill Denim',
      type: 'FINISHED_GOODS',
      category: 'Fabric',
      unit: 'METER',
      currentStock: 820.0,
      minimumStock: 150.0,
      unitCost: 450.0,
      color: 'Indigo Blue'
    }
  });

  const cottonYarn = await prisma.product.upsert({
    where: { code: 'YRN-COT-30S' },
    update: {},
    create: {
      code: 'YRN-COT-30S',
      name: '30s Combed Cotton Yarn Cone',
      type: 'RAW_MATERIAL',
      category: 'Yarn',
      unit: 'KG',
      currentStock: 1250.0,
      minimumStock: 300.0,
      unitCost: 280.0
    }
  });

  const indigoDye = await prisma.product.upsert({
    where: { code: 'DYE-IND-01' },
    update: {},
    create: {
      code: 'DYE-IND-01',
      name: 'Synthetic Indigo Vat Dye Grain',
      type: 'CONSUMABLE',
      category: 'Chemical/Dye',
      unit: 'KG',
      currentStock: 60.0,
      minimumStock: 100.0,
      unitCost: 650.0
    }
  });

  // Shortage demonstration material
  const silkYarnShort = await prisma.product.upsert({
    where: { code: 'YRN-SILK-WARP' },
    update: { currentStock: 10.0 }, // Intentional low stock for SHORT demonstration
    create: {
      code: 'YRN-SILK-WARP',
      name: 'Mulberry Silk Filament Warp Yarn',
      type: 'RAW_MATERIAL',
      category: 'Yarn',
      unit: 'KG',
      currentStock: 10.0,
      minimumStock: 100.0,
      unitCost: 1800.0
    }
  });

  console.log('   ✓ Products & materials ready');

  // 2. Ensure Customer & Sales Order
  const customer = await prisma.customer.upsert({
    where: { id: 'cust_apex_01' },
    update: {},
    create: {
      id: 'cust_apex_01',
      name: 'Apex Apparels Ltd',
      companyName: 'Apex International Garments',
      email: 'procurement@apexapparels.com',
      phone: '+91 98250 11223',
      address: 'Plot 45, GIDC Industrial Estate, Surat, Gujarat'
    }
  });

  const salesOrder = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-0001' },
    update: {},
    create: {
      orderNumber: 'SO-2026-0001',
      customerId: customer.id,
      deliveryDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'IN_PRODUCTION',
      totalAmount: 210000.0,
      items: {
        create: [
          {
            productId: finishedProduct.id,
            fabricType: '12oz Denim Twill',
            color: 'Indigo Blue',
            quantity: 500.0,
            unitPrice: 420.0,
            totalPrice: 210000.0
          }
        ]
      }
    }
  });

  console.log('   ✓ Customer & Sales Order SO-2026-0001 ready');

  // 3. Ensure Machines
  const machines = [
    { code: 'SPN-01', name: 'Rieter Ring Frame G38', type: 'SPINNING', status: 'IDLE', capacityPerShift: 250.0 },
    { code: 'WEV-01', name: 'Picanol OmniPlus-i Airjet', type: 'WEAVING', status: 'IDLE', capacityPerShift: 350.0 },
    { code: 'DYE-01', name: 'Fong’s High-Temp Dyeing Jigger', type: 'DYEING', status: 'RUNNING', capacityPerShift: 500.0 },
    { code: 'FIN-01', name: 'Monforts Stenter Finishing Range', type: 'FINISHING', status: 'IDLE', capacityPerShift: 600.0 }
  ];

  for (const m of machines) {
    await prisma.machine.upsert({
      where: { code: m.code },
      update: { status: m.status },
      create: m
    });
  }

  // 4. Ensure 6 Employees Across Departments
  const employeesData = [
    { employeeCode: 'EMP-101', name: 'Ramesh Patel', department: 'SPINNING', role: 'Ring Frame Master', wagePerShift: 650.0 },
    { employeeCode: 'EMP-102', name: 'Sunita Sharma', department: 'WEAVING', role: 'Loom Technician', wagePerShift: 700.0 },
    { employeeCode: 'EMP-103', name: 'Anil Gupta', department: 'QUALITY', role: 'Lead Roll Inspector', wagePerShift: 600.0 },
    { employeeCode: 'EMP-104', name: 'Kavita Verma', department: 'DYEING', role: 'Dye Kitchen Supervisor', wagePerShift: 680.0 },
    { employeeCode: 'EMP-105', name: 'Manoj Yadav', department: 'WAREHOUSE', role: 'Stores Incharge', wagePerShift: 550.0 },
    { employeeCode: 'EMP-106', name: 'Rajesh Joshi', department: 'MANAGEMENT', role: 'Mill Operations Manager', wagePerShift: 1100.0 }
  ];

  const seededEmployees = [];
  for (const e of employeesData) {
    const emp = await prisma.employee.upsert({
      where: { employeeCode: e.employeeCode },
      update: { name: e.name, department: e.department, wagePerShift: e.wagePerShift },
      create: e
    });
    seededEmployees.push(emp);
  }

  console.log('   ✓ 6 Employees seeded');

  // 5. Seed Today\'s Shift Attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'HALF_DAY', 'LEAVE', 'PRESENT'];
  for (let i = 0; i < seededEmployees.length; i++) {
    const emp = seededEmployees[i];
    const status = statuses[i];
    const wage = status === 'PRESENT' ? emp.wagePerShift : status === 'HALF_DAY' ? emp.wagePerShift * 0.5 : 0;

    await prisma.attendance.upsert({
      where: {
        employeeId_date_shift: {
          employeeId: emp.id,
          date: today,
          shift: 'MORNING'
        }
      },
      update: { status, wageCalculated: wage },
      create: {
        employeeId: emp.id,
        date: today,
        shift: 'MORNING',
        status,
        wageCalculated: wage
      }
    });
  }

  console.log('   ✓ Morning shift attendance recorded for all 6 workers');

  // 6. Production Order 1: SPINNING & WEAVING COMPLETED, DYEING IN PROGRESS (Has SHORT material)
  const po1 = await prisma.productionOrder.upsert({
    where: { orderNumber: 'PO-2026-0001' },
    update: { stage: 'DYEING', status: 'IN_PROGRESS', producedQuantity: 470.0 },
    create: {
      orderNumber: 'PO-2026-0001',
      salesOrderId: salesOrder.id,
      productId: finishedProduct.id,
      stage: 'DYEING',
      status: 'IN_PROGRESS',
      targetQuantity: 500.0,
      producedQuantity: 470.0,
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });

  // Stage Logs for PO 1
  await prisma.productionStageLog.upsert({
    where: {
      productionOrderId_stage: {
        productionOrderId: po1.id,
        stage: 'SPINNING'
      }
    },
    update: { status: 'COMPLETED', inputQuantity: 500.0, outputQuantity: 490.0, wasteQuantity: 10.0 },
    create: {
      productionOrderId: po1.id,
      stage: 'SPINNING',
      status: 'COMPLETED',
      inputQuantity: 500.0,
      outputQuantity: 490.0,
      wasteQuantity: 10.0,
      startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 36 * 60 * 60 * 1000)
    }
  });

  await prisma.productionStageLog.upsert({
    where: {
      productionOrderId_stage: {
        productionOrderId: po1.id,
        stage: 'WEAVING'
      }
    },
    update: { status: 'COMPLETED', inputQuantity: 490.0, outputQuantity: 470.0, wasteQuantity: 20.0 },
    create: {
      productionOrderId: po1.id,
      stage: 'WEAVING',
      status: 'COMPLETED',
      inputQuantity: 490.0,
      outputQuantity: 470.0,
      wasteQuantity: 20.0,
      startedAt: new Date(Date.now() - 35 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
    }
  });

  await prisma.productionStageLog.upsert({
    where: {
      productionOrderId_stage: {
        productionOrderId: po1.id,
        stage: 'DYEING'
      }
    },
    update: { status: 'IN_PROGRESS', inputQuantity: 470.0 },
    create: {
      productionOrderId: po1.id,
      stage: 'DYEING',
      status: 'IN_PROGRESS',
      inputQuantity: 470.0,
      outputQuantity: 0.0,
      wasteQuantity: 0.0,
      startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
    }
  });

  // Material Consumptions for PO 1
  await prisma.materialConsumption.upsert({
    where: {
      productionOrderId_rawMaterialId_stage: {
        productionOrderId: po1.id,
        rawMaterialId: cottonYarn.id,
        stage: 'SPINNING'
      }
    },
    update: { plannedQuantity: 520.0, actualQuantity: 515.0, isDeducted: true },
    create: {
      productionOrderId: po1.id,
      rawMaterialId: cottonYarn.id,
      stage: 'SPINNING',
      plannedQuantity: 520.0,
      actualQuantity: 515.0,
      unit: 'KG',
      isDeducted: true
    }
  });

  // Shortage demonstration material
  await prisma.materialConsumption.upsert({
    where: {
      productionOrderId_rawMaterialId_stage: {
        productionOrderId: po1.id,
        rawMaterialId: silkYarnShort.id,
        stage: 'WEAVING'
      }
    },
    update: { plannedQuantity: 80.0, actualQuantity: 0.0, isDeducted: false },
    create: {
      productionOrderId: po1.id,
      rawMaterialId: silkYarnShort.id,
      stage: 'WEAVING',
      plannedQuantity: 80.0, // planned 80kg, available 10kg -> SHORT!
      actualQuantity: 0.0,
      unit: 'KG',
      isDeducted: false
    }
  });

  console.log('   ✓ PO-2026-0001 seeded (Spinning & Weaving Done, Dyeing Active, Material Shortage demo)');

  // 7. Production Order 2: FULLY COMPLETED ORDER with Inspections (2 PASSED, 1 REWORK, 1 REJECTED)
  const po2 = await prisma.productionOrder.upsert({
    where: { orderNumber: 'PO-2026-0002' },
    update: { stage: 'COMPLETED', status: 'COMPLETED', producedQuantity: 420.0 },
    create: {
      orderNumber: 'PO-2026-0002',
      salesOrderId: salesOrder.id,
      productId: finishedProduct.id,
      stage: 'COMPLETED',
      status: 'COMPLETED',
      targetQuantity: 420.0,
      producedQuantity: 420.0,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    }
  });

  // Inspections for PO 2
  // Roll 1: PASSED
  await prisma.qualityInspection.upsert({
    where: { rollNumber: 'ROLL-2026-0001' },
    update: { status: 'PASSED' },
    create: {
      rollNumber: 'ROLL-2026-0001',
      productionOrderId: po2.id,
      metersInspected: 120.0,
      status: 'PASSED',
      defectType: 'NONE',
      defectSeverity: 'MINOR',
      inspectorName: 'Anil Gupta',
      notes: 'Clean denim roll. GSM 380 verified.'
    }
  });

  // Roll 2: PASSED
  await prisma.qualityInspection.upsert({
    where: { rollNumber: 'ROLL-2026-0002' },
    update: { status: 'PASSED' },
    create: {
      rollNumber: 'ROLL-2026-0002',
      productionOrderId: po2.id,
      metersInspected: 120.0,
      status: 'PASSED',
      defectType: 'NONE',
      defectSeverity: 'MINOR',
      inspectorName: 'Anil Gupta',
      notes: 'Passed first pass inspection.'
    }
  });

  // Roll 3: REWORK with defects
  const reworkRoll = await prisma.qualityInspection.upsert({
    where: { rollNumber: 'ROLL-2026-0003' },
    update: { status: 'REWORK' },
    create: {
      rollNumber: 'ROLL-2026-0003',
      productionOrderId: po2.id,
      metersInspected: 100.0,
      status: 'REWORK',
      defectType: 'COLOR_MISMATCH',
      defectSeverity: 'MAJOR',
      inspectorName: 'Anil Gupta',
      notes: 'Indigo streak along meter 45-60. Sent for re-washing.'
    }
  });

  await prisma.defectRecord.createMany({
    data: [
      {
        inspectionId: reworkRoll.id,
        defectType: 'COLOR_MISMATCH',
        defectQty: 15.0,
        severity: 'MAJOR',
        location: 'Meter 45-60',
        notes: 'Dye bath concentration fluctuation'
      }
    ],
    skipDuplicates: true
  });

  // Roll 4: REJECTED with defects
  const rejectedRoll = await prisma.qualityInspection.upsert({
    where: { rollNumber: 'ROLL-2026-0004' },
    update: { status: 'REJECTED' },
    create: {
      rollNumber: 'ROLL-2026-0004',
      productionOrderId: po2.id,
      metersInspected: 80.0,
      status: 'REJECTED',
      defectType: 'HOLES',
      defectSeverity: 'CRITICAL',
      inspectorName: 'Anil Gupta',
      notes: 'Warp yarn rupture creating recurring holes. Roll scrapped.'
    }
  });

  await prisma.defectRecord.createMany({
    data: [
      {
        inspectionId: rejectedRoll.id,
        defectType: 'HOLES',
        defectQty: 8.0,
        severity: 'CRITICAL',
        location: 'Meter 10-35',
        notes: 'Needle punch perforation'
      }
    ],
    skipDuplicates: true
  });

  console.log('   ✓ PO-2026-0002 seeded (Completed, 2 PASSED rolls, 1 REWORK with defects, 1 REJECTED)');
  console.log('🎉 Factory Operations demo seeding completed successfully!');
}

seedFactory()
  .catch((e) => {
    console.error('❌ Error during Factory Operations seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
