const { prisma } = require('../config/prisma');

async function listSuppliers() {
  return await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { purchaseOrders: true } } }
  });
}

async function createSupplier(data) {
  return await prisma.supplier.create({
    data: {
      name: data.name.trim(),
      contactPerson: data.contactPerson || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      yarnTypesSupplied: data.yarnTypesSupplied || null
    }
  });
}

async function listPurchaseOrders() {
  return await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: true,
      items: { include: { product: true } }
    }
  });
}

module.exports = {
  listSuppliers,
  createSupplier,
  listPurchaseOrders
};
