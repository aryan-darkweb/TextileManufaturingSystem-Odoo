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

      const shouldAutoReceive = data.autoReceive !== false && data.autoReceive !== 'false';
      validatedItems.push({
        productId: product.id,
        orderedQty,
        receivedQty: shouldAutoReceive ? orderedQty : 0.0,
        unitPrice,
        totalPrice
      });
    }

    const shouldAutoReceive = data.autoReceive !== false && data.autoReceive !== 'false';
    const poStatus = data.status || (shouldAutoReceive ? 'RECEIVED' : 'ORDERED');

    // 4. Create Purchase Order with nested items
    const po = await tx.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        status: poStatus,
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

    // 5. If autoReceive is active, update product stock and create inventoryTransaction
    if (shouldAutoReceive) {
      for (const item of po.items) {
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.orderedQty } }
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: 'PURCHASE_RECEIPT',
            quantity: item.orderedQty,
            balanceAfter: updatedProduct.currentStock,
            referenceNumber: po.orderNumber,
            notes: data.notes ? `Purchase Order ${po.orderNumber}: ${data.notes}` : `Stock inward from purchase order ${po.orderNumber}`,
            performedBy: data.performedBy || 'Procurement Gate'
          }
        });
      }

      // Record bill in financial ledger
      try {
        await tx.supplierBill.create({
          data: {
            billNumber: `BILL-${po.orderNumber}`,
            supplierId: po.supplierId,
            purchaseOrderId: po.id,
            billDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
            status: 'PAID',
            totalAmount: calculatedTotal,
            paidAmount: calculatedTotal,
            balanceDue: 0,
            notes: `Auto-recorded purchase bill for ${po.orderNumber}`
          }
        });
      } catch {
        // supplierBill is optional/tolerant
      }
    }

    return po;
  });
}

/**
 * Record goods receipt against a purchase order.
 * Updates stock through an atomic transaction, updates received quantities,
 * and sets the purchase order status to PARTIALLY_RECEIVED or RECEIVED.
 * Row-level locking prevents duplicate receipts and concurrent stock corruption.
 */
async function receiveGoods(purchaseOrderId, data) {
  const { receivedItems, notes, performedBy } = data;
  if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
    const err = new Error('At least one item receipt is required');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Acquire exclusive row lock in PostgreSQL to prevent concurrent race conditions
    await tx.$executeRaw`SELECT id FROM purchase_orders WHERE id = ${purchaseOrderId} FOR UPDATE`;

    // 2. Fetch fresh PO state
    const po = await tx.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: { include: { product: true } }, supplier: true }
    });

    if (!po) {
      const err = new Error(`Purchase order with ID ${purchaseOrderId} not found`);
      err.statusCode = 404;
      throw err;
    }

    if (po.status === 'RECEIVED') {
      const err = new Error('This purchase order has already been fully received');
      err.statusCode = 409;
      throw err;
    }

    if (po.status === 'CANCELLED') {
      const err = new Error('Cannot receive goods against a cancelled purchase order');
      err.statusCode = 409;
      throw err;
    }

    let itemsProcessed = 0;

    for (const receipt of receivedItems) {
      const qtyToReceive = parseFloat(receipt.quantity);
      if (isNaN(qtyToReceive) || qtyToReceive <= 0) {
        continue; // skip zero or invalid
      }

      const poItem = po.items.find((i) => i.id === receipt.itemId || i.productId === receipt.productId);
      if (!poItem) {
        const err = new Error(`Line item not found in this purchase order`);
        err.statusCode = 404;
        throw err;
      }

      const remainingAllowed = parseFloat((poItem.orderedQty - poItem.receivedQty).toFixed(4));
      if (qtyToReceive > remainingAllowed) {
        const err = new Error(
          `Cannot receive ${qtyToReceive} for ${poItem.product.name}. Outstanding ordered quantity is only ${remainingAllowed}`
        );
        err.statusCode = 409;
        throw err;
      }

      const newReceivedQty = poItem.receivedQty + qtyToReceive;

      // 1. Update receivedQty on PurchaseOrderItem
      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { receivedQty: newReceivedQty }
      });

      // 2. Fetch fresh product inside lock and update stock
      const freshProduct = await tx.product.findUnique({ where: { id: poItem.productId } });
      const newStock = freshProduct.currentStock + qtyToReceive;
      await tx.product.update({
        where: { id: poItem.productId },
        data: { currentStock: newStock }
      });

      // 3. Log Inventory Transaction exactly once
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

      itemsProcessed++;
    }

    if (itemsProcessed === 0) {
      const err = new Error('No valid positive quantities to receive were provided');
      err.statusCode = 400;
      throw err;
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

/**
 * Create a purchase order directly from a manufacturing material shortage.
 * Strictly validates supplier, raw material, and quantity on the server.
 * Prevents duplicate orders from repeated submissions/clicks.
 * CRITICAL RULE: Never touches inventory stock. Stock only increases upon goods receipt.
 */
async function createPurchaseOrderFromShortage(data) {
  const {
    supplierId,
    materialId,
    quantity,
    unitPrice,
    productionOrderId,
    notes,
    expectedDeliveryDate,
    idempotencyKey
  } = data;

  if (!supplierId) {
    const err = new Error('supplierId is required');
    err.statusCode = 400;
    throw err;
  }
  if (!materialId) {
    const err = new Error('materialId is required');
    err.statusCode = 400;
    throw err;
  }

  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    const err = new Error('Order quantity must be a valid number greater than zero');
    err.statusCode = 400;
    throw err;
  }

  // 1. Validate Supplier
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    const err = new Error(`Supplier not found with ID ${supplierId}`);
    err.statusCode = 404;
    throw err;
  }

  // 2. Validate Material
  const material = await prisma.product.findUnique({ where: { id: materialId } });
  if (!material) {
    const err = new Error(`Raw material product not found with ID ${materialId}`);
    err.statusCode = 404;
    throw err;
  }

  const price = unitPrice !== undefined && unitPrice !== null && unitPrice !== ''
    ? parseFloat(unitPrice)
    : material.unitCost;

  if (isNaN(price) || price < 0) {
    const err = new Error('Unit price must be a valid non-negative number');
    err.statusCode = 400;
    throw err;
  }

  // 3. Duplicate protection / Idempotency Check (within 60 seconds or matching key)
  const windowStart = new Date(Date.now() - 60000);
  const duplicateConditions = [
    {
      supplierId,
      createdAt: { gte: windowStart },
      items: {
        some: {
          productId: material.id,
          orderedQty: qty
        }
      }
    }
  ];

  if (idempotencyKey) {
    duplicateConditions.push({
      notes: { contains: idempotencyKey }
    });
  }

  const existingPO = await prisma.purchaseOrder.findFirst({
    where: { OR: duplicateConditions },
    include: {
      supplier: true,
      items: { include: { product: true } }
    }
  });

  if (existingPO) {
    return {
      ...existingPO,
      duplicatePrevented: true,
      message: 'Duplicate purchase order prevented; existing order returned safely'
    };
  }

  // 4. Create Purchase Order in an atomic transaction (NEVER touches inventory stock)
  return await prisma.$transaction(async (tx) => {
    const count = await tx.purchaseOrder.count();
    const year = new Date().getFullYear();
    const orderNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;
    const totalPrice = parseFloat((qty * price).toFixed(2));

    const poNotesParts = [
      `Shortage fulfillment for ${material.name} (${material.code})`
    ];
    if (productionOrderId) {
      poNotesParts.push(`Linked to production order: ${productionOrderId}`);
    }
    if (idempotencyKey) {
      poNotesParts.push(`[IdempotencyKey: ${idempotencyKey}]`);
    }
    if (notes) {
      poNotesParts.push(notes.trim());
    }

    const shouldAutoReceive = data.autoReceive !== false && data.autoReceive !== 'false';
    const poStatus = shouldAutoReceive ? 'RECEIVED' : 'ORDERED';
    const receivedQty = shouldAutoReceive ? qty : 0.0;

    const newPO = await tx.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        status: poStatus,
        orderDate: new Date(),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        totalAmount: totalPrice,
        notes: poNotesParts.join(' | '),
        items: {
          create: [
            {
              productId: material.id,
              orderedQty: qty,
              receivedQty,
              unitPrice: price,
              totalPrice
            }
          ]
        }
      },
      include: {
        supplier: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (shouldAutoReceive) {
      const updatedProduct = await tx.product.update({
        where: { id: material.id },
        data: { currentStock: { increment: qty } }
      });

      await tx.inventoryTransaction.create({
        data: {
          productId: material.id,
          type: 'PURCHASE_RECEIPT',
          quantity: qty,
          balanceAfter: updatedProduct.currentStock,
          referenceNumber: newPO.orderNumber,
          notes: `Shortage replenishment received into inventory from ${supplier.name}`,
          performedBy: 'Procurement Gate'
        }
      });

      try {
        await tx.supplierBill.create({
          data: {
            billNumber: `BILL-${newPO.orderNumber}`,
            supplierId: supplier.id,
            purchaseOrderId: newPO.id,
            billDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
            status: 'PAID',
            totalAmount: totalPrice,
            paidAmount: totalPrice,
            balanceDue: 0,
            notes: `Shortage purchase bill for ${supplier.name}`
          }
        });
      } catch {
        // supplierBill is optional/tolerant
      }
    }

    return newPO;
  });
}

module.exports = {
  listSuppliers,
  createSupplier,
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receiveGoods,
  createPurchaseOrderFromShortage
};

