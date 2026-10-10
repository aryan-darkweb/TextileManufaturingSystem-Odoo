const { prisma } = require('../config/prisma');

async function listSalesOrders(filters = {}) {
  const where = {};
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  return await prisma.salesOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              unit: true
            }
          }
        }
      },
      productionOrders: {
        select: {
          id: true,
          orderNumber: true,
          stage: true,
          status: true
        }
      },
      dispatchRecords: {
        select: {
          id: true,
          dispatchNumber: true,
          status: true
        }
      }
    }
  });
}

async function getSalesOrderById(id) {
  return await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          product: true
        }
      },
      productionOrders: {
        include: {
          machine: true,
          inspections: true
        }
      },
      dispatchRecords: true
    }
  });
}

async function createSalesOrder(data) {
  return await prisma.$transaction(async (tx) => {
    // 1. Resolve or create customer
    let customerId = data.customerId;
    if (!customerId) {
      if (!data.customerName) {
        throw new Error('Either customerId or customerName is required');
      }
      const newCustomer = await tx.customer.create({
        data: {
          name: data.customerName.trim(),
          companyName: data.companyName ? data.companyName.trim() : null,
          email: data.customerEmail ? data.customerEmail.trim() : null,
          phone: data.customerPhone ? data.customerPhone.trim() : null,
          address: data.customerAddress ? data.customerAddress.trim() : null
        }
      });
      customerId = newCustomer.id;
    }

    // 2. Generate unique orderNumber if not provided
    let orderNumber = data.orderNumber;
    if (!orderNumber) {
      const count = await tx.salesOrder.count();
      const year = new Date().getFullYear();
      orderNumber = `SO-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // 3. Process items and calculate totals
    const rawItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];
    if (rawItems.length === 0) {
      throw new Error('Sales order must contain at least one line item');
    }

    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of rawItems) {
      const product = await tx.product.findUnique({
        where: { id: item.productId }
      });
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Line item quantity must be greater than zero');
      }
      if (isNaN(unitPrice) || unitPrice < 0) {
        throw new Error('Line item unit price must be a valid non-negative number');
      }

      const totalPrice = quantity * unitPrice;
      calculatedTotal += totalPrice;

      validatedItems.push({
        productId: product.id,
        fabricType: item.fabricType || product.category || 'Standard Fabric',
        color: item.color || product.color || 'Natural',
        quantity,
        unitPrice,
        totalPrice
      });
    }

    // 4. Create the Sales Order with nested items
    const salesOrder = await tx.salesOrder.create({
      data: {
        orderNumber,
        customerId,
        deliveryDeadline: new Date(data.deliveryDeadline || Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: data.status || 'PENDING',
        totalAmount: calculatedTotal,
        notes: data.notes || null,
        items: {
          create: validatedItems
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    return salesOrder;
  });
}

async function listCustomers() {
  return await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { salesOrders: true }
      }
    }
  });
}

async function createCustomer(data) {
  return await prisma.customer.create({
    data: {
      name: data.name.trim(),
      companyName: data.companyName ? data.companyName.trim() : null,
      email: data.email ? data.email.trim() : null,
      phone: data.phone ? data.phone.trim() : null,
      address: data.address ? data.address.trim() : null
    }
  });
}

module.exports = {
  listSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  listCustomers,
  createCustomer
};
