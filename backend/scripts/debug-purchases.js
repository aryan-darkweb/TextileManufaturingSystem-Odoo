const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- RECENT PURCHASE ORDERS ---');
  const pos = await prisma.purchaseOrder.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { supplier: true, items: { include: { product: true } } }
  });
  console.log(JSON.stringify(pos.map(p => ({
    id: p.id,
    orderNumber: p.orderNumber,
    supplier: p.supplier.name,
    status: p.status,
    createdAt: p.createdAt,
    items: p.items.map(i => ({
      product: i.product.name,
      code: i.product.code,
      orderedQty: i.orderedQty,
      receivedQty: i.receivedQty,
      currentProductStock: i.product.currentStock
    }))
  })), null, 2));

  console.log('\n--- RECENT INVENTORY TRANSACTIONS ---');
  const txs = await prisma.inventoryTransaction.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { product: true }
  });
  console.log(JSON.stringify(txs.map(t => ({
    id: t.id,
    product: t.product.name,
    type: t.type,
    quantity: t.quantity,
    referenceNumber: t.referenceNumber,
    createdAt: t.createdAt
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
