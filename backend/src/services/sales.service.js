const { prisma } = require('../config/prisma');

/**
 * Derive meaningful, substantiateable factory & fulfillment workflow stage.
 * Never guessed from a manual dropdown; calculated from production, quality, and dispatches.
 */
async function deriveOrderWorkflowStatus(orderOrId) {
  let order = orderOrId;
  if (typeof orderOrId === 'string') {
    order = await prisma.salesOrder.findUnique({
      where: { id: orderOrId },
      include: {
        items: { include: { product: true } },
        productionOrders: { include: { inspections: true } },
        dispatchRecords: true
      }
    });
  }

  if (!order) {
    return {
      stageKey: 'ORDER_RECEIVED',
      stage: 'ORDER_RECEIVED',
      stageLabel: 'Order Received & Confirmed',
      label: 'Order Received & Confirmed',
      badgeColor: 'purple',
      progressPct: 10,
      progressPercent: 10
    };
  }

  // 1. Dispatches
  const dispatches = order.dispatchRecords || [];
  if (dispatches.some((d) => d.status === 'DELIVERED')) {
    return {
      stageKey: 'DELIVERED',
      stage: 'DELIVERED',
      stageLabel: 'Delivered to Buyer',
      label: 'Delivered to Buyer',
      badgeColor: 'emerald',
      progressPct: 100,
      progressPercent: 100
    };
  }
  if (dispatches.some((d) => d.status === 'DISPATCHED') || order.status === 'DISPATCHED') {
    return {
      stageKey: 'DISPATCHED',
      stage: 'DISPATCHED',
      stageLabel: 'Dispatched (Gate Pass Cleared)',
      label: 'Dispatched (Gate Pass Cleared)',
      badgeColor: 'emerald',
      progressPct: 100,
      progressPercent: 100
    };
  }

  // 2. Production Orders & Quality Inspections
  const pos = order.productionOrders || [];
  if (pos.length > 0) {
    const allInspections = pos.flatMap((p) => p.inspections || []);

    if (allInspections.some((i) => i.status === 'REWORK')) {
      return {
        stageKey: 'REWORK_REQUIRED',
        stage: 'REWORK_REQUIRED',
        stageLabel: 'Rework Required (QC Defects Found)',
        label: 'Rework Required (QC Defects Found)',
        badgeColor: 'amber',
        progressPct: 80,
        progressPercent: 80
      };
    }
    if (allInspections.some((i) => i.status === 'REJECTED')) {
      return {
        stageKey: 'QUALITY_REJECTED',
        stage: 'QUALITY_REJECTED',
        stageLabel: 'Quality Hold (Rolls Rejected)',
        label: 'Quality Hold (Rolls Rejected)',
        badgeColor: 'rose',
        progressPct: 80,
        progressPercent: 80
      };
    }

    const passedRolls = allInspections.filter((i) => i.status === 'PASSED').length;
    const allFinished = pos.every((p) => p.status === 'COMPLETED' || p.stage === 'COMPLETED');

    if (allFinished && passedRolls > 0) {
      return {
        stageKey: 'READY_FOR_DISPATCH',
        stage: 'READY_FOR_DISPATCH',
        stageLabel: `Ready for Dispatch (${passedRolls} Rolls Approved)`,
        label: `Ready for Dispatch (${passedRolls} Rolls Approved)`,
        badgeColor: 'violet',
        progressPct: 95,
        progressPercent: 95
      };
    }

    if (passedRolls > 0 && !allFinished) {
      return {
        stageKey: 'QUALITY_APPROVED_PARTIAL',
        stage: 'QUALITY_APPROVED_PARTIAL',
        stageLabel: `Quality Approved (${passedRolls} Rolls Passed)`,
        label: `Quality Approved (${passedRolls} Rolls Passed)`,
        badgeColor: 'violet',
        progressPct: 85,
        progressPercent: 85
      };
    }

    // Active production stage
    const activePo = pos.find((p) => p.status === 'IN_PROGRESS') || pos[0];
    const stageName = activePo.stage || 'SPINNING';
    const stageDisplay = stageName.charAt(0) + stageName.slice(1).toLowerCase();

    let targetTotal = 0;
    let producedTotal = 0;
    for (const p of pos) {
      targetTotal += p.targetQuantity || 0;
      producedTotal += p.producedQuantity || 0;
    }
    const pct = targetTotal > 0 ? Math.min(90, Math.round((producedTotal / targetTotal) * 100)) : 40;

    return {
      stageKey: 'MANUFACTURING_IN_PROGRESS',
      stage: 'MANUFACTURING_IN_PROGRESS',
      stageLabel: `Manufacturing in Progress (${stageDisplay})`,
      label: `Manufacturing in Progress (${stageDisplay})`,
      badgeColor: 'indigo',
      progressPct: Math.max(25, pct),
      progressPercent: Math.max(25, pct)
    };
  }

  // 3. Pre-production / Stock availability check
  const items = order.items || [];
  const allStockAvailable = items.length > 0 && items.every((it) => (it.product?.currentStock || 0) >= it.quantity);

  if (allStockAvailable) {
    return {
      stageKey: 'MATERIAL_CHECKED',
      stage: 'MATERIAL_CHECKED',
      stageLabel: 'Stock Available in Warehouse',
      label: 'Stock Available in Warehouse',
      badgeColor: 'sky',
      progressPct: 20,
      progressPercent: 20
    };
  }

  const anyStockShort = items.some((it) => (it.product?.currentStock || 0) < it.quantity);
  if (anyStockShort && items.length > 0) {
    return {
      stageKey: 'AWAITING_MATERIALS',
      stage: 'AWAITING_MATERIALS',
      stageLabel: 'Awaiting Materials / Inward Intake',
      label: 'Awaiting Materials / Inward Intake',
      badgeColor: 'amber',
      progressPct: 15,
      progressPercent: 15
    };
  }

  return {
    stageKey: 'ORDER_RECEIVED',
    stage: 'ORDER_RECEIVED',
    stageLabel: 'Order Received & Confirmed',
    label: 'Order Received & Confirmed',
    badgeColor: 'purple',
    progressPct: 10,
    progressPercent: 10
  };
}

async function listSalesOrders(filters = {}) {
  const where = {};
  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }
  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  const orders = await prisma.salesOrder.findMany({
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
        include: {
          inspections: true
        }
      },
      dispatchRecords: {
        select: {
          id: true,
          dispatchNumber: true,
          status: true,
          dispatchedAt: true,
          dispatchedRollCount: true
        }
      },
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          paidAmount: true,
          balanceDue: true,
          status: true
        }
      }
    }
  });

  return orders.map((ord) => {
    const totalInvoiced = ord.invoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
    const totalPaid = ord.invoices.reduce((s, inv) => s + (inv.paidAmount || 0), 0);
    const balanceDue = Math.max(0, totalInvoiced - totalPaid);

    return {
      ...ord,
      workflowStage: deriveOrderWorkflowStatus(ord),
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      balanceDue: Math.round(balanceDue * 100) / 100
    };
  });
}

async function getSalesOrderById(id) {
  const order = await prisma.salesOrder.findUnique({
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
          inspections: true,
          stageLogs: { include: { operator: true, machine: true } }
        }
      },
      dispatchRecords: true,
      invoices: {
        include: { payments: true }
      }
    }
  });

  if (!order) return null;

  const totalInvoiced = order.invoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
  const totalPaid = order.invoices.reduce((s, inv) => s + (inv.paidAmount || 0), 0);
  const balanceDue = Math.max(0, totalInvoiced - totalPaid);

  return {
    ...order,
    workflowStage: deriveOrderWorkflowStatus(order),
    totalInvoiced: Math.round(totalInvoiced * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    balanceDue: Math.round(balanceDue * 100) / 100
  };
}

async function createSalesOrder(data) {
  return await prisma.$transaction(async (tx) => {
    // 1. Resolve or create customer/buyer
    let customerId = data.customerId;
    if (!customerId) {
      if (!data.customerName) {
        const err = new Error('Either customerId or customerName is required');
        err.statusCode = 400;
        throw err;
      }
      if (!data.customerPhone) {
        const err = new Error('Buyer phone number is required and must be exactly 10 numeric digits');
        err.statusCode = 400;
        throw err;
      }
      const cleanPhone = String(data.customerPhone).trim();
      if (!/^\d{10}$/.test(cleanPhone)) {
        const err = new Error('Phone number must contain exactly 10 numeric digits (e.g. 9876543210)');
        err.statusCode = 400;
        throw err;
      }

      const newCustomer = await tx.customer.create({
        data: {
          name: data.customerName.trim(),
          companyName: data.companyName ? data.companyName.trim() : null,
          email: data.customerEmail ? data.customerEmail.trim() : null,
          phone: cleanPhone,
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
        status: data.status || 'CONFIRMED',
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
  const allowed = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'DISPATCHED', 'COMPLETED', 'CANCELLED'];
  if (!allowed.includes(status)) {
    const err = new Error(`Invalid status. Allowed values: ${allowed.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const order = await prisma.salesOrder.findUnique({ where: { id } });
  if (!order) {
    const err = new Error(`Sales order with ID ${id} not found`);
    err.statusCode = 404;
    throw err;
  }

  return await prisma.salesOrder.update({
    where: { id },
    data: { status },
    include: {
      customer: true,
      items: true
    }
  });
}

async function listCustomers() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { salesOrders: true, invoices: true }
      },
      salesOrders: {
        select: { totalAmount: true }
      },
      invoices: {
        select: { totalAmount: true, paidAmount: true, balanceDue: true }
      }
    }
  });

  return customers.map((c) => {
    const totalOrderValue = c.salesOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalInvoiced = c.invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalPaid = c.invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const balanceDue = Math.max(0, totalInvoiced - totalPaid);

    return {
      id: c.id,
      name: c.name,
      companyName: c.companyName,
      email: c.email,
      phone: c.phone,
      address: c.address,
      createdAt: c.createdAt,
      totalOrdersCount: c._count.salesOrders,
      totalOrderValue: Math.round(totalOrderValue * 100) / 100,
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      balanceDue: Math.round(balanceDue * 100) / 100
    };
  });
}

async function getCustomerById(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      salesOrders: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
          productionOrders: { include: { inspections: true } },
          dispatchRecords: true,
          invoices: { include: { payments: true } }
        }
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        include: { payments: true }
      }
    }
  });

  if (!customer) {
    const err = new Error(`Buyer customer with ID ${id} not found`);
    err.statusCode = 404;
    throw err;
  }

  const enrichedOrders = customer.salesOrders.map((ord) => {
    const totalInvoiced = ord.invoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
    const totalPaid = ord.invoices.reduce((s, inv) => s + (inv.paidAmount || 0), 0);
    const balanceDue = Math.max(0, totalInvoiced - totalPaid);

    return {
      ...ord,
      workflowStage: deriveOrderWorkflowStatus(ord),
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      balanceDue: Math.round(balanceDue * 100) / 100
    };
  });

  const totalOrderValue = enrichedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalInvoicedAmount = customer.invoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
  const totalPaidAmount = customer.invoices.reduce((s, inv) => s + (inv.paidAmount || 0), 0);
  const totalOutstandingBalance = Math.max(0, totalInvoicedAmount - totalPaidAmount);

  return {
    ...customer,
    salesOrders: enrichedOrders,
    financialSummary: {
      totalOrdersCount: enrichedOrders.length,
      totalOrderValue: Math.round(totalOrderValue * 100) / 100,
      totalInvoicedAmount: Math.round(totalInvoicedAmount * 100) / 100,
      totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
      totalOutstandingBalance: Math.round(totalOutstandingBalance * 100) / 100
    }
  };
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

async function updateCustomer(id, data) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error(`Buyer customer with ID ${id} not found`);
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (data.name && data.name.trim()) updateData.name = data.name.trim();
  if (data.companyName !== undefined) updateData.companyName = data.companyName ? data.companyName.trim() : null;
  if (data.email !== undefined) updateData.email = data.email ? data.email.trim() : null;
  if (data.address !== undefined) updateData.address = data.address ? data.address.trim() : null;

  if (data.phone) {
    const cleanPhone = String(data.phone).trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      const err = new Error('Phone number must contain exactly 10 numeric digits (e.g. 9876543210)');
      err.statusCode = 400;
      throw err;
    }
    updateData.phone = cleanPhone;
  }

  return await prisma.customer.update({
    where: { id },
    data: updateData
  });
}

module.exports = {
  listSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateOrderStatus,
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deriveOrderWorkflowStatus
};
