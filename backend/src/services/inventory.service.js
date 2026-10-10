const { prisma } = require('../config/prisma');

async function listProducts(filters = {}) {
  const where = {};
  if (filters.type) {
    where.type = filters.type;
  }
  if (filters.category) {
    where.category = { contains: filters.category, mode: 'insensitive' };
  }
  if (filters.lowStock === 'true' || filters.lowStock === true) {
    // Current stock <= minimumStock
    where.currentStock = { lte: prisma.product.fields.minimumStock };
  }

  return await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          inventoryTransactions: true,
          salesOrderItems: true
        }
      }
    }
  });
}

async function getProductById(id) {
  return await prisma.product.findUnique({
    where: { id },
    include: {
      inventoryTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });
}

async function createProduct(data) {
  const initialStock = parseFloat(data.initialStock) || 0;
  const unitCost = parseFloat(data.unitCost) || 0;
  const minimumStock = parseFloat(data.minimumStock) || 0;

  // Use a transaction if initial stock needs to be logged in inventory transactions
  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        type: data.type,
        category: data.category.trim(),
        unit: data.unit,
        currentStock: initialStock,
        minimumStock: minimumStock,
        unitCost: unitCost,
        color: data.color ? data.color.trim() : null,
        specifications: data.specifications ? data.specifications.trim() : null,
        status: data.status || 'ACTIVE'
      }
    });

    if (initialStock > 0) {
      await tx.inventoryTransaction.create({
        data: {
          productId: product.id,
          type: 'PURCHASE_RECEIPT',
          quantity: initialStock,
          balanceAfter: initialStock,
          referenceNumber: 'INITIAL_STOCK',
          notes: 'Initial inventory intake upon product creation',
          performedBy: data.performedBy || 'System User'
        }
      });
    }

    return product;
  });
}

async function recordTransaction(data) {
  const quantity = parseFloat(data.quantity);
  if (isNaN(quantity) || quantity === 0) {
    throw new Error('Transaction quantity must be a non-zero number');
  }

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: data.productId }
    });

    if (!product) {
      throw new Error(`Product not found with ID ${data.productId}`);
    }

    const newStock = product.currentStock + quantity;
    if (newStock < 0) {
      throw new Error(
        `Insufficient inventory stock. Current: ${product.currentStock}, requested reduction: ${Math.abs(quantity)}`
      );
    }

    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { currentStock: newStock }
    });

    const transaction = await tx.inventoryTransaction.create({
      data: {
        productId: product.id,
        type: data.type,
        quantity: quantity,
        balanceAfter: newStock,
        referenceNumber: data.referenceNumber || null,
        notes: data.notes || null,
        performedBy: data.performedBy || 'System User'
      }
    });

    return { product: updatedProduct, transaction };
  });
}

async function getLowStockAlerts() {
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE'
    }
  });

  return products.filter((p) => p.currentStock <= p.minimumStock);
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  recordTransaction,
  getLowStockAlerts
};
