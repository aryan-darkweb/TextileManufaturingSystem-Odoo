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
              unit: true,
              currentStock: true
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
          status: true,
          dispatchedAt: true
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
      if (!data.customerName || !data.customerName.trim()) {
        const err = new Error('Either customerId or customerName is required');
        err.statusCode = 400;
        throw err;
      }
      if (data.customerPhone) {
        const cleanPhone = String(data.customerPhone).trim();
        if (!/^\d{10}$/.test(cleanPhone)) {
          const err = new Error('Customer phone number must contain exactly 10 numeric digits');
          err.statusCode = 400;
          throw err;
        }
      }
      const newCustomer = await tx.customer.create({
        data: {
          name: data.customerName.trim(),
          companyName: data.companyName ? data.companyName.trim() : null,
          email: data.customerEmail ? data.customerEmail.trim() : null,
          phone: data.customerPhone ? String(data.customerPhone).trim() : null,
          address: data.customerAddress ? data.customerAddress.trim() : null
        }
      });
      customerId = newCustomer.id;
    }

    // 2. Validate Delivery Deadline: Must be in the future (reject yesterday and earlier)
    if (!data.deliveryDeadline) {
      const err = new Error('Delivery deadline is required');
      err.statusCode = 400;
      throw err;
    }
    const deadlineDate = new Date(data.deliveryDeadline);
    if (isNaN(deadlineDate.getTime())) {
      const err = new Error('Invalid delivery deadline date format');
      err.statusCode = 400;
      throw err;
    }
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate(), 0, 0, 0, 0);
    if (deadlineDay < todayStart) {
      const err = new Error('Delivery deadline cannot be in the past. Yesterday and all earlier dates are strictly rejected.');
      err.statusCode = 400;
      throw err;
    }

    // 3. Generate unique orderNumber if not provided
    let orderNumber = data.orderNumber;
    if (!orderNumber) {
      const count = await tx.salesOrder.count();
      const year = new Date().getFullYear();
      orderNumber = `SO-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // 4. Process items and calculate totals
    const rawItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];
    if (rawItems.length === 0) {
      const err = new Error('Sales order must contain at least one line item');
      err.statusCode = 400;
      throw err;
    }

    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of rawItems) {
      const product = await tx.product.findUnique({
        where: { id: item.productId }
      });
      if (!product) {
        const err = new Error(`Product with ID ${item.productId} not found`);
        err.statusCode = 404;
        throw err;
      }

      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      if (isNaN(quantity) || quantity <= 0) {
        const err = new Error('Line item quantity must be greater than zero');
        err.statusCode = 400;
        throw err;
      }
      if (isNaN(unitPrice) || unitPrice < 0) {
        const err = new Error('Line item unit price must be a valid non-negative number');
        err.statusCode = 400;
        throw err;
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

    // 5. Create the Sales Order with nested items
    const salesOrder = await tx.salesOrder.create({
      data: {
        orderNumber,
        customerId,
        deliveryDeadline: deadlineDate,
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

async function updateOrderStatus(id, status) {
  const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'DISPATCHED', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}`);
  }

  return await prisma.salesOrder.update({
    where: { id },
    data: { status },
    include: {
      customer: true,
      items: {
        include: { product: true }
      }
    }
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
  if (!data.name || !data.name.trim()) {
    const err = new Error('Buyer / Customer name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!data.phone) {
    const err = new Error('Phone number is required and must contain exactly 10 numeric digits');
    err.statusCode = 400;
    throw err;
  }
  const cleanPhone = String(data.phone).trim();
  if (!/^\d{10}$/.test(cleanPhone)) {
    const err = new Error('Phone number must contain exactly 10 numeric digits (e.g. 9876543210)');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.customer.create({
    data: {
      name: data.name.trim(),
      companyName: data.companyName ? data.companyName.trim() : null,
      email: data.email ? data.email.trim() : null,
      phone: cleanPhone,
      address: data.address ? data.address.trim() : null
    }
  });
}

module.exports = {
  listSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateOrderStatus,
  listCustomers,
  createCustomer
};
