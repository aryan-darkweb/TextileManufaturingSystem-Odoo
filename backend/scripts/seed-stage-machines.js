const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 12 Parallel Stage Machines (4 Spinning, 4 Weaving, 4 Dyeing)...');

  const machines = [
    // 4 SPINNING MACHINES
    {
      code: 'SPN-01',
      name: 'Rieter Ring Spinning Frame G38',
      type: 'SPINNING',
      status: 'RUNNING',
      capacityPerShift: 1200,
      currentShift: 'Shift A'
    },
    {
      code: 'SPN-02',
      name: 'Murata Vortex Spun Frame 870',
      type: 'SPINNING',
      status: 'RUNNING',
      capacityPerShift: 1500,
      currentShift: 'Shift A'
    },
    {
      code: 'SPN-03',
      name: 'Marzoli Ring Spun Frame MDS1',
      type: 'SPINNING',
      status: 'IDLE',
      capacityPerShift: 1100,
      currentShift: 'Shift B'
    },
    {
      code: 'SPN-04',
      name: 'Saurer Autocoro Open-End 9',
      type: 'SPINNING',
      status: 'RUNNING',
      capacityPerShift: 1400,
      currentShift: 'Shift A'
    },

    // 4 WEAVING MACHINES
    {
      code: 'WEV-01',
      name: 'Picanol OmniPlus-i Airjet Loom 01',
      type: 'WEAVING',
      status: 'RUNNING',
      capacityPerShift: 1800,
      currentShift: 'Shift A'
    },
    {
      code: 'WEV-02',
      name: 'Toyota JAT810 Airjet Loom 02',
      type: 'WEAVING',
      status: 'RUNNING',
      capacityPerShift: 2000,
      currentShift: 'Shift A'
    },
    {
      code: 'WEV-03',
      name: 'Itema R9500-2 Rapier Weaving Loom',
      type: 'WEAVING',
      status: 'IDLE',
      capacityPerShift: 1600,
      currentShift: 'Shift B'
    },
    {
      code: 'WEV-04',
      name: 'Tsudakoma ZAX9200i Master Airjet',
      type: 'WEAVING',
      status: 'RUNNING',
      capacityPerShift: 1900,
      currentShift: 'Shift A'
    },

    // 4 DYEING MACHINES
    {
      code: 'DYE-01',
      name: 'Fong High-Temp Soft Dyeing Jet',
      type: 'DYEING',
      status: 'RUNNING',
      capacityPerShift: 1200,
      currentShift: 'Shift A'
    },
    {
      code: 'DYE-02',
      name: 'Thies Soft-TRD Air Stream Dyeing',
      type: 'DYEING',
      status: 'RUNNING',
      capacityPerShift: 1400,
      currentShift: 'Shift A'
    },
    {
      code: 'DYE-03',
      name: 'Brazzoli Ecofriendly Overflow Dyeing',
      type: 'DYEING',
      status: 'IDLE',
      capacityPerShift: 1000,
      currentShift: 'Shift B'
    },
    {
      code: 'DYE-04',
      name: 'Sclavos Athena HT Fabric Dyeing',
      type: 'DYEING',
      status: 'RUNNING',
      capacityPerShift: 1300,
      currentShift: 'Shift A'
    }
  ];

  for (const m of machines) {
    const upserted = await prisma.machine.upsert({
      where: { code: m.code },
      update: {
        name: m.name,
        type: m.type,
        status: m.status,
        capacityPerShift: m.capacityPerShift,
        currentShift: m.currentShift
      },
      create: m
    });
    console.log(`  [OK] Machine ${upserted.code} (${upserted.type}): ${upserted.name} -> ${upserted.status}`);
  }

  // Also seed some initial production stage logs for historical input/output tracking
  const allDbMachines = await prisma.machine.findMany();
  const prodOrders = await prisma.productionOrder.findMany({ take: 10 });

  if (prodOrders.length > 0) {
    console.log('\nAssigning historical stage input and output tracking across machines...');
    for (let i = 0; i < prodOrders.length; i++) {
      const order = prodOrders[i];
      const spinM = allDbMachines.find(m => m.code === `SPN-0${(i % 4) + 1}`);
      const weavM = allDbMachines.find(m => m.code === `WEV-0${(i % 4) + 1}`);
      const dyeM = allDbMachines.find(m => m.code === `DYE-0${(i % 4) + 1}`);

      const baseInput = (order.targetQuantity || 25) * 1.5;
      const baseOutput = order.targetQuantity || 25;

      // Spinning stage log
      await prisma.productionStageLog.upsert({
        where: {
          productionOrderId_stage: {
            productionOrderId: order.id,
            stage: 'SPINNING'
          }
        },
        update: {
          machineId: spinM?.id,
          inputQuantity: baseInput,
          outputQuantity: Math.round(baseInput * 0.96),
          status: 'COMPLETED'
        },
        create: {
          productionOrderId: order.id,
          stage: 'SPINNING',
          machineId: spinM?.id,
          inputQuantity: baseInput,
          outputQuantity: Math.round(baseInput * 0.96),
          status: 'COMPLETED'
        }
      });

      // Weaving stage log
      await prisma.productionStageLog.upsert({
        where: {
          productionOrderId_stage: {
            productionOrderId: order.id,
            stage: 'WEAVING'
          }
        },
        update: {
          machineId: weavM?.id,
          inputQuantity: Math.round(baseInput * 0.96),
          outputQuantity: baseOutput,
          status: 'COMPLETED'
        },
        create: {
          productionOrderId: order.id,
          stage: 'WEAVING',
          machineId: weavM?.id,
          inputQuantity: Math.round(baseInput * 0.96),
          outputQuantity: baseOutput,
          status: 'COMPLETED'
        }
      });

      // Dyeing stage log
      await prisma.productionStageLog.upsert({
        where: {
          productionOrderId_stage: {
            productionOrderId: order.id,
            stage: 'DYEING'
          }
        },
        update: {
          machineId: dyeM?.id,
          inputQuantity: baseOutput,
          outputQuantity: baseOutput,
          status: 'COMPLETED'
        },
        create: {
          productionOrderId: order.id,
          stage: 'DYEING',
          machineId: dyeM?.id,
          inputQuantity: baseOutput,
          outputQuantity: baseOutput,
          status: 'COMPLETED'
        }
      });
    }
  }

  const count = await prisma.machine.count();
  console.log(`\nSuccessfully verified ${count} total machines in database.`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
