const { prisma } = require('../config/prisma');

async function listSuppliers() {
  return await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { purchaseOrders: true } } }
  });
}

async function createSupplier(data) {
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Supplier name is required');
  }

  return await prisma.supplier.create({
    data: {
      name: data.name.trim(),
      contactPerson: data.contactPerson ? data.contactPerson.trim() : null,
      email: data.email ? data.email.trim() : null,
      phone: data.phone ? data.phone.trim() : null,
      address: data.address ? data.address.trim() : null,
      yarnTypesSupplied: data.yarnTypesSupplied ? data.yarnTypesSupplied.trim() : null
    }
  });
}

async function listPurchaseOrders(filters = {}) {
  const where = {};
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.supplierId) {
    where.supplierId = filters.supplierId;
  }

  return await prisma.purchaseOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
              currentStock: true
            }
          }
        }
      }
    }
  });
}

async function getPurchaseOrderById(id) {
  return await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: {
          product: true
        }
      }
    }
  });
}

async function createPurchaseOrder(data) {
  return await prisma.$transaction(async (tx) => {
    // 1. Resolve or create supplier
    let supplierId = data.supplierId;
    if (!supplierId) {
      if (!data.supplierName) {
        throw new Error('Either supplierId or supplierName is required');
      }
      const newSupplier = await tx.supplier.create({
        data: {
          name: data.supplierName.trim(),
          contactPerson: data.contactPerson ? data.contactPerson.trim() : null,
          email: data.supplierEmail ? data.supplierEmail.trim() : null,
          phone: data.supplierPhone ? data.supplierPhone.trim() : null,
          yarnTypesSupplied: data.yarnTypesSupplied ? data.yarnTypesSupplied.trim() : null
        }
      });
      supplierId = newSupplier.id;
    }

    // 2. Generate unique orderNumber
    let orderNumber = data.orderNumber;
    if (!orderNumber) {
      const count = await tx.purchaseOrder.count();
      const year = new Date().getFullYear();
      orderNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // 3. Process items and calculate totals
    const rawItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];
    if (rawItems.length === 0) {
      throw new Error('Purchase order must contain at least one item');
    }

    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of rawItems) {
      let product = null;
      if (item.productId) {
        product = await tx.product.findUnique({ where: { id: item.productId } });
      } else if (item.productName || item.name) {
        const name = (item.productName || item.name).trim();
        const code = (item.productCode || item.code || `MAT-${Date.now().toString().slice(-6)}`).trim().toUpperCase();
        product = await tx.product.findUnique({ where: { code } });
        if (!product) {
          product = await tx.product.create({
            data: {
              code,
              name,
              type: item.type || 'RAW_MATERIAL',
              category: item.category || 'Raw Material',
              unit: item.unit || 'KG',
              currentStock: 0.0,
              minimumStock: parseFloat(item.minimumStock) || 50.0,
              unitCost: parseFloat(item.unitPrice) || 0.0,
              color: item.color || null
            }
          });
        }
      }

      if (!product) {
        throw new Error(`Product or material details with valid ID or Name are required`);
      }

      const orderedQty = parseFloat(item.orderedQty || item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      if (isNaN(orderedQty) || orderedQty <= 0) {
        throw new Error('Ordered quantity must be greater than zero');
      }
      if (isNaN(unitPrice) || unitPrice < 0) {
        throw new Error('Unit price must be a valid non-negative number');
      }

      const totalPrice = orderedQty * unitPrice;
      calculatedTotal += totalPrice;

      validatedItems.push({
        productId: product.id,
        orderedQty,
        receivedQty: 0.0,
        unitPrice,
        totalPrice
      });
    }

    // 4. Create Purchase Order with nested items
    return await tx.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        status: data.status || 'ORDERED',
        orderDate: new Date(data.orderDate || Date.now()),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        totalAmount: calculatedTotal,
        notes: data.notes ? data.notes.trim() : null,
        items: {
          create: validatedItems
        }
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
  });
}

/**
 * Record goods receipt against a purchase order.
 * Updates stock through an atomic transaction, updates received quantities,
 * and sets the purchase order status to PARTIALLY_RECEIVED or RECEIVED.
 */
async function receiveGoods(purchaseOrderId, data) {
  const { receivedItems, notes, performedBy } = data;
  if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
    throw new Error('At least one item receipt is required');
  }

  return await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: { include: { product: true } }, supplier: true }
    });

    if (!po) {
      throw new Error(`Purchase order with ID ${purchaseOrderId} not found`);
    }

    if (po.status === 'RECEIVED') {
      throw new Error('This purchase order has already been fully received');
    }

    if (po.status === 'CANCELLED') {
      throw new Error('Cannot receive goods against a cancelled purchase order');
    }

    for (const receipt of receivedItems) {
      const qtyToReceive = parseFloat(receipt.quantity);
      if (isNaN(qtyToReceive) || qtyToReceive <= 0) {
        continue; // skip zero or invalid
      }

      const poItem = po.items.find((i) => i.id === receipt.itemId || i.productId === receipt.productId);
      if (!poItem) {
        throw new Error(`Line item not found in this purchase order`);
      }

      const remainingAllowed = poItem.orderedQty - poItem.receivedQty;
      if (qtyToReceive > remainingAllowed) {
        throw new Error(
          `Cannot receive ${qtyToReceive} for ${poItem.product.name}. Outstanding ordered quantity is only ${remainingAllowed}`
        );
      }

      const newReceivedQty = poItem.receivedQty + qtyToReceive;

      // 1. Update receivedQty on PurchaseOrderItem
      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { receivedQty: newReceivedQty }
      });

      // 2. Increase stock on Product
      const newStock = poItem.product.currentStock + qtyToReceive;
      await tx.product.update({
        where: { id: poItem.productId },
        data: { currentStock: newStock }
      });

      // 3. Log Inventory Transaction
      await tx.inventoryTransaction.create({
        data: {
          productId: poItem.productId,
          type: 'PURCHASE_RECEIPT',
          quantity: qtyToReceive,
          balanceAfter: newStock,
          referenceNumber: po.orderNumber,
          notes: notes || `Goods received against ${po.orderNumber} from ${po.supplier.name}`,
          performedBy: performedBy || 'Warehouse Lead'
        }
      });
    }

    // Refresh PO items to evaluate new overall status
    const updatedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId }
    });

    const allFullyReceived = updatedItems.every((it) => it.receivedQty >= it.orderedQty);
    const anyReceived = updatedItems.some((it) => it.receivedQty > 0);

    const newStatus = allFullyReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status;

    return await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: newStatus },
      include: {
        supplier: true,
        items: {
          include: { product: true }
        }
      }
    });
  });
}

module.exports = {
  listSuppliers,
  createSupplier,
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receiveGoods
};
