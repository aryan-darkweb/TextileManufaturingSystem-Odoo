const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TextileFlow demo seed (idempotent upsert)...');

  // 1. Seed Products (Raw materials & Finished goods for Everest Textile Mills)
  const products = [
    {
      code: 'YRN-COT-30S',
      name: '30s Combed Cotton Yarn Cone',
      type: 'RAW_MATERIAL',
      category: 'Yarn',
      unit: 'KG',
      currentStock: 1250.0,
      minimumStock: 300.0,
      unitCost: 280.0,
      color: 'Raw Ecru',
      specifications: '100% Combed Cotton, 30s Ne count'
    },
    {
      code: 'YRN-POLY-40S',
      name: '40s Spun Polyester Yarn',
      type: 'RAW_MATERIAL',
      category: 'Yarn',
      unit: 'KG',
      currentStock: 450.0,
      minimumStock: 200.0,
      unitCost: 195.0,
      color: 'Optical White',
      specifications: '100% Polyester, 40s Ne'
    },
    {
      code: 'FAB-DNM-12OZ',
      name: '12oz Indigo Twill Denim',
      type: 'FINISHED_GOODS',
      category: 'Fabric',
      unit: 'METER',
      currentStock: 820.0,
      minimumStock: 150.0,
      unitCost: 450.0,
      color: 'Indigo Blue',
      specifications: '3/1 Right Hand Twill, 58 inch width'
    },
    {
      code: 'FAB-POPLIN-60',
      name: 'Pure Cotton Poplin Shirting',
      type: 'FINISHED_GOODS',
      category: 'Fabric',
      unit: 'METER',
      currentStock: 80.0, // Low stock trigger for demo
      minimumStock: 200.0,
      unitCost: 320.0,
      color: 'Sky Blue',
      specifications: '60x60/92x88, 56 inch width'
    },
    {
      code: 'DYE-IND-01',
      name: 'Synthetic Indigo Vat Dye Grain',
      type: 'CONSUMABLE',
      category: 'Chemical/Dye',
      unit: 'KG',
      currentStock: 60.0,
      minimumStock: 100.0, // Low stock
      unitCost: 650.0,
      color: 'Deep Indigo',
      specifications: '94% Purity Vat Dye'
    }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        type: p.type,
        category: p.category,
        unit: p.unit,
        currentStock: p.currentStock,
        minimumStock: p.minimumStock,
        unitCost: p.unitCost,
        color: p.color,
        specifications: p.specifications
      },
      create: p
    });
    console.log(`   - Product upserted: ${p.code} (${p.name})`);
  }

  // 2. Seed Buyers / Customers
  const customer1 = await prisma.customer.upsert({
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

  const customer2 = await prisma.customer.upsert({
    where: { id: 'cust_urban_02' },
    update: {},
    create: {
      id: 'cust_urban_02',
      name: 'Urban Weaves Export Co',
      companyName: 'Urban Weaves Private Limited',
      email: 'orders@urbanweaves.com',
      phone: '+91 98790 44556',
      address: 'Phase 2, Peenya Industrial Area, Bengaluru, Karnataka'
    }
  });

  console.log('   - Seeded customers: Apex Apparels & Urban Weaves');

  // 3. Seed Supplier
  await prisma.supplier.upsert({
    where: { id: 'sup_vardhman_01' },
    update: {},
    create: {
      id: 'sup_vardhman_01',
      name: 'Vardhman Spinning Mills',
      contactPerson: 'Suresh Singhania',
      email: 'sales@vardhmanspinning.com',
      phone: '+91 94170 33221',
      address: 'Ludhiana, Punjab',
      yarnTypesSupplied: 'Cotton 30s, 40s, 60s'
    }
  });

  // 4. Seed Machines (Factory Operations - Teammate Skeleton)
  const machines = [
    { code: 'SPN-01', name: 'Rieter Ring Frame G38', type: 'SPINNING', status: 'RUNNING', capacityPerShift: 250.0 },
    { code: 'WEV-01', name: 'Picanol OmniPlus-i Airjet', type: 'WEAVING', status: 'RUNNING', capacityPerShift: 350.0 },
    { code: 'WEV-02', name: 'Tsudakoma ZAX-9200i Airjet', type: 'WEAVING', status: 'IDLE', capacityPerShift: 320.0 },
    { code: 'DYE-01', name: 'Fong’s High-Temp Dyeing Jigger', type: 'DYEING', status: 'RUNNING', capacityPerShift: 500.0 }
  ];

  for (const m of machines) {
    await prisma.machine.upsert({
      where: { code: m.code },
      update: { name: m.name, status: m.status },
      create: m
    });
  }

  // 5. Seed Employees (Factory Operations - Teammate Skeleton)
  const employees = [
    { employeeCode: 'EMP-101', name: 'Ramesh Patel', department: 'SPINNING', role: 'Head Spinner', wagePerShift: 650.0 },
    { employeeCode: 'EMP-102', name: 'Sunita Sharma', department: 'WEAVING', role: 'Weaving Master', wagePerShift: 700.0 },
    { employeeCode: 'EMP-103', name: 'Anil Gupta', department: 'QUALITY', role: 'Chief QC Inspector', wagePerShift: 600.0 }
  ];

  for (const e of employees) {
    await prisma.employee.upsert({
      where: { employeeCode: e.employeeCode },
      update: { name: e.name, department: e.department, wagePerShift: e.wagePerShift },
      create: e
    });
  }

  console.log('✅ Demo seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
