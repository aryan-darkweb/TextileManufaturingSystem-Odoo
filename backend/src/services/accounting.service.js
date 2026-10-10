const { prisma } = require('../config/prisma');

// ==============================================================================
// 1. INVOICES & BUYER PAYMENTS
// ==============================================================================

async function createInvoice(data) {
  const { salesOrderId, customerId, dueDate, notes, items, taxRate = 0, taxAmount: directTax, discountAmount: directDiscount } = data;

  if (!customerId && !salesOrderId) {
    const err = new Error('Either customerId or salesOrderId is required');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    let resolvedCustomerId = customerId;
    let order = null;

    if (salesOrderId) {
      // Prevent duplicate invoicing for the same sales order
      const existingInv = await tx.invoice.findFirst({
        where: { salesOrderId, status: { not: 'CANCELLED' } }
      });
      if (existingInv) {
        const err = new Error(`Invoice already issued for sales order (${existingInv.invoiceNumber})`);
        err.statusCode = 400;
        throw err;
      }

      order = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: { customer: true, items: { include: { product: true } } }
      });
      if (!order) {
        const err = new Error(`Sales order ${salesOrderId} not found`);
        err.statusCode = 404;
        throw err;
      }
      resolvedCustomerId = order.customerId;
    }

    const count = await tx.invoice.count();
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

    let validatedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      validatedItems = items.map((it) => {
        const qty = parseFloat(it.quantity) || 1;
        const price = parseFloat(it.unitPrice) || 0;
        return {
          productId: it.productId || null,
          description: it.description || 'Textile Fabric Supply',
          quantity: qty,
          unitPrice: price,
          totalPrice: Math.round(qty * price * 100) / 100
        };
      });
    } else if (order && order.items.length > 0) {
      validatedItems = order.items.map((it) => ({
        productId: it.productId,
        description: `${it.fabricType || 'Fabric'} (${it.color || 'Natural'})`,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice
      }));
    } else {
      const err = new Error('Invoice must contain at least one line item');
      err.statusCode = 400;
      throw err;
    }

    const subtotal = validatedItems.reduce((sum, it) => sum + it.totalPrice, 0);
    const taxAmount = directTax !== undefined
      ? Math.round(parseFloat(directTax) * 100) / 100
      : Math.round(subtotal * (parseFloat(taxRate) || 0) * 100) / 100;
    const discountAmount = directDiscount !== undefined
      ? Math.round(parseFloat(directDiscount) * 100) / 100
      : 0;
    const totalAmount = Math.max(0, Math.round((subtotal + taxAmount - discountAmount) * 100) / 100);

    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        salesOrderId: salesOrderId || null,
        customerId: resolvedCustomerId,
        issueDate: data.issueDate || data.invoiceDate ? new Date(data.issueDate || data.invoiceDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'ISSUED',
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount: 0.0,
        balanceDue: totalAmount,
        notes: notes || null,
        items: {
          create: validatedItems
        }
      },
      include: {
        customer: true,
        salesOrder: true,
        items: true,
        payments: true
      }
    });

    return {
      ...inv,
      balanceAmount: inv.balanceDue
    };
  });
}

async function listInvoices(filters = {}) {
  const where = {};
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.salesOrderId) where.salesOrderId = filters.salesOrderId;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;

  return await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      salesOrder: true,
      items: true,
      payments: true
    }
  });
}

async function getInvoiceById(id) {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      salesOrder: true,
      items: true,
      payments: { orderBy: { paymentDate: 'desc' } }
    }
  });
  if (!inv) {
    const err = new Error(`Invoice with ID ${id} not found`);
    err.statusCode = 404;
    throw err;
  }
  return inv;
}

async function recordBuyerPayment(data) {
  const { invoiceId, amount, paymentMethod = 'BANK_TRANSFER', notes, paymentDate } = data;
  const ref = data.referenceNumber || data.reference;

  const paymentVal = parseFloat(amount);
  if (isNaN(paymentVal) || paymentVal <= 0) {
    const err = new Error('Payment amount must be a positive number');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    // Idempotency guard for duplicate payment submission
    if (ref) {
      const existing = await tx.buyerPayment.findFirst({
        where: { referenceNumber: String(ref).trim() }
      });
      if (existing) {
        const err = new Error(`Payment with reference "${ref}" has already been recorded (idempotency guard)`);
        err.statusCode = 400;
        throw err;
      }
    }

    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true }
    });

    if (!invoice) {
      const err = new Error(`Invoice with ID ${invoiceId} not found`);
      err.statusCode = 404;
      throw err;
    }

    if (invoice.status === 'PAID' || invoice.balanceDue <= 0) {
      const err = new Error(`Invoice ${invoice.invoiceNumber} is already fully paid`);
      err.statusCode = 400;
      throw err;
    }

    const roundedPayment = Math.round(paymentVal * 100) / 100;
    if (roundedPayment > invoice.balanceDue + 0.01) {
      const err = new Error(
        `Payment amount (₹${roundedPayment}) exceeds remaining balance due (₹${invoice.balanceDue})`
      );
      err.statusCode = 400;
      throw err;
    }

    const count = await tx.buyerPayment.count();
    const year = new Date().getFullYear();
    const paymentNumber = `PAY-${year}-${String(count + 1).padStart(4, '0')}`;

    const newPaidAmount = Math.round((invoice.paidAmount + roundedPayment) * 100) / 100;
    const newBalanceDue = Math.max(0, Math.round((invoice.totalAmount - newPaidAmount) * 100) / 100);
    const newStatus = newBalanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

    const payment = await tx.buyerPayment.create({
      data: {
        paymentNumber,
        invoiceId,
        amount: roundedPayment,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod,
        referenceNumber: ref ? String(ref).trim() : null,
        notes: notes || null
      }
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newStatus
      }
    });

    return {
      ...payment,
      balanceAmount: newBalanceDue
    };
  });
}

// ==============================================================================
// 2. SUPPLIER BILLS & SUPPLIER PAYMENTS
// ==============================================================================

async function createSupplierBill(data) {
  const { purchaseOrderId, supplierId, dueDate, notes, items, billDate, subtotal: directSubtotal, taxAmount: directTax } = data;

  if (!supplierId && !purchaseOrderId) {
    const err = new Error('Either supplierId or purchaseOrderId is required');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    let resolvedSupplierId = supplierId;
    let po = null;

    if (purchaseOrderId) {
      po = await tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: { supplier: true, items: { include: { product: true } } }
      });
      if (!po) {
        const err = new Error(`Purchase order ${purchaseOrderId} not found`);
        err.statusCode = 404;
        throw err;
      }
      resolvedSupplierId = po.supplierId;
    }

    const count = await tx.supplierBill.count();
    const year = new Date().getFullYear();
    const defaultBillNumber = `BILL-${year}-${String(count + 1).padStart(4, '0')}`;
    const billNumber = data.billNumber ? String(data.billNumber).trim() : defaultBillNumber;

    let validatedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      validatedItems = items.map((it) => {
        const qty = parseFloat(it.quantity) || 1;
        const price = parseFloat(it.unitPrice) || 0;
        return {
          productId: it.productId || null,
          description: it.description || 'Raw Material Inward Supply',
          quantity: qty,
          unitPrice: price,
          totalPrice: Math.round(qty * price * 100) / 100
        };
      });
    } else if (po && po.items.length > 0) {
      validatedItems = po.items.map((it) => ({
        productId: it.productId,
        description: `${it.product?.name || 'Raw Material'} (${it.product?.code || ''})`,
        quantity: it.receivedQty > 0 ? it.receivedQty : it.orderedQty,
        unitPrice: it.unitPrice,
        totalPrice: Math.round((it.receivedQty > 0 ? it.receivedQty : it.orderedQty) * it.unitPrice * 100) / 100
      }));
    } else if (directSubtotal !== undefined) {
      const sub = parseFloat(directSubtotal) || 0;
      validatedItems = [{
        productId: null,
        description: notes || 'Raw Material Inward Supply',
        quantity: 1,
        unitPrice: sub,
        totalPrice: sub
      }];
    } else {
      const err = new Error('Supplier bill must contain at least one item');
      err.statusCode = 400;
      throw err;
    }

    const subtotal = validatedItems.reduce((sum, it) => sum + it.totalPrice, 0);
    const taxAmount = directTax !== undefined ? parseFloat(directTax) || 0 : 0;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    const bill = await tx.supplierBill.create({
      data: {
        billNumber,
        supplierId: resolvedSupplierId,
        purchaseOrderId: purchaseOrderId || null,
        billDate: billDate ? new Date(billDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'POSTED',
        totalAmount,
        paidAmount: 0.0,
        balanceDue: totalAmount,
        notes: notes || null,
        items: {
          create: validatedItems
        }
      },
      include: {
        supplier: true,
        purchaseOrder: true,
        items: true,
        payments: true
      }
    });

    return {
      ...bill,
      balanceAmount: bill.balanceDue
    };
  });
}

async function listSupplierBills(filters = {}) {
  const where = {};
  if (filters.supplierId) where.supplierId = filters.supplierId;
  if (filters.purchaseOrderId) where.purchaseOrderId = filters.purchaseOrderId;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;

  const bills = await prisma.supplierBill.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: true,
      purchaseOrder: true,
      items: true,
      payments: true
    }
  });

  return bills.map((b) => ({
    ...b,
    balanceAmount: b.balanceDue
  }));
}

async function recordSupplierPayment(data) {
  const { billId, amount, paymentMethod = 'BANK_TRANSFER', notes, paymentDate } = data;
  const ref = data.referenceNumber || data.reference;

  const paymentVal = parseFloat(amount);
  if (isNaN(paymentVal) || paymentVal <= 0) {
    const err = new Error('Payment amount must be a positive number');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    // Idempotency guard for supplier payments
    if (ref) {
      const existing = await tx.supplierPayment.findFirst({
        where: { referenceNumber: String(ref).trim() }
      });
      if (existing) {
        const err = new Error(`Supplier payment with reference "${ref}" has already been recorded (idempotency guard)`);
        err.statusCode = 400;
        throw err;
      }
    }

    const bill = await tx.supplierBill.findUnique({
      where: { id: billId },
      include: { supplier: true }
    });

    if (!bill) {
      const err = new Error(`Supplier bill with ID ${billId} not found`);
      err.statusCode = 404;
      throw err;
    }

    if (bill.status === 'PAID' || bill.balanceDue <= 0) {
      const err = new Error(`Supplier bill ${bill.billNumber} is already fully paid`);
      err.statusCode = 400;
      throw err;
    }

    const roundedPayment = Math.round(paymentVal * 100) / 100;
    if (roundedPayment > bill.balanceDue + 0.01) {
      const err = new Error(
        `Payment amount (₹${roundedPayment}) exceeds remaining balance due (₹${bill.balanceDue})`
      );
      err.statusCode = 400;
      throw err;
    }

    const count = await tx.supplierPayment.count();
    const year = new Date().getFullYear();
    const paymentNumber = `SPAY-${year}-${String(count + 1).padStart(4, '0')}`;

    const newPaidAmount = Math.round((bill.paidAmount + roundedPayment) * 100) / 100;
    const newBalanceDue = Math.max(0, Math.round((bill.totalAmount - newPaidAmount) * 100) / 100);
    const newStatus = newBalanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

    const payment = await tx.supplierPayment.create({
      data: {
        paymentNumber,
        billId,
        amount: roundedPayment,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod,
        referenceNumber: ref ? String(ref).trim() : null,
        notes: notes || null
      }
    });

    await tx.supplierBill.update({
      where: { id: billId },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newStatus
      }
    });

    return {
      ...payment,
      balanceAmount: newBalanceDue
    };
  });
}

// ==============================================================================
// 3. PAYROLL PAYMENTS & BUSINESS EXPENSES
// ==============================================================================

async function recordPayrollPayment(data) {
  const { month, employeeId, amountPaid, paymentMethod = 'BANK_TRANSFER', referenceNumber, notes, totalShifts } = data;

  const amt = parseFloat(amountPaid);
  if (isNaN(amt) || amt <= 0) {
    const err = new Error('Amount paid must be a positive number');
    err.statusCode = 400;
    throw err;
  }
  if (!month) {
    const err = new Error('Payroll month is required (YYYY-MM)');
    err.statusCode = 400;
    throw err;
  }

  const count = await prisma.payrollPayment.count();
  const year = new Date().getFullYear();
  const payoutNumber = `PAYROLL-${year}-${String(count + 1).padStart(4, '0')}`;

  return await prisma.payrollPayment.create({
    data: {
      payoutNumber,
      month,
      employeeId: employeeId || null,
      totalShifts: parseInt(totalShifts, 10) || 0,
      amountPaid: Math.round(amt * 100) / 100,
      paymentMethod,
      referenceNumber: referenceNumber || null,
      notes: notes || null
    },
    include: { employee: true }
  });
}

async function listPayrollPayments(filters = {}) {
  const where = {};
  if (filters.month) where.month = filters.month;
  if (filters.employeeId) where.employeeId = filters.employeeId;

  return await prisma.payrollPayment.findMany({
    where,
    orderBy: { paidAt: 'desc' },
    include: { employee: true }
  });
}

async function recordBusinessExpense(data) {
  const { category, amount, expenseDate, paymentMethod = 'BANK_TRANSFER', referenceNumber, notes } = data;

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    const err = new Error('Expense amount must be a positive number');
    err.statusCode = 400;
    throw err;
  }
  if (!category) {
    const err = new Error('Expense category is required (e.g. Utilities, Maintenance, Transport)');
    err.statusCode = 400;
    throw err;
  }

  const count = await prisma.businessExpense.count();
  const year = new Date().getFullYear();
  const expenseNumber = `EXP-${year}-${String(count + 1).padStart(4, '0')}`;
  const expNotes = data.notes || data.title || data.description || null;

  const exp = await prisma.businessExpense.create({
    data: {
      expenseNumber,
      category: category.trim(),
      amount: Math.round(amt * 100) / 100,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      paymentMethod,
      referenceNumber: referenceNumber || data.reference || null,
      notes: expNotes
    }
  });

  return {
    ...exp,
    title: exp.notes || exp.category
  };
}

async function listBusinessExpenses(filters = {}) {
  const where = {};
  if (filters.category) where.category = filters.category;

  const expenses = await prisma.businessExpense.findMany({
    where,
    orderBy: { expenseDate: 'desc' }
  });

  return expenses.map((e) => ({
    ...e,
    title: e.notes || e.category
  }));
}

// ==============================================================================
// 4. CENTRAL FINANCIAL TRANSACTIONS FEED
// ==============================================================================

async function listCentralTransactions(filters = {}) {
  const { type, startDate, endDate, search } = filters;

  const [invoices, buyerPayments, bills, supplierPayments, payrollPayments, expenses] = await Promise.all([
    prisma.invoice.findMany({ include: { customer: true, salesOrder: true } }),
    prisma.buyerPayment.findMany({ include: { invoice: { include: { customer: true } } } }),
    prisma.supplierBill.findMany({ include: { supplier: true, purchaseOrder: true } }),
    prisma.supplierPayment.findMany({ include: { bill: { include: { supplier: true } } } }),
    prisma.payrollPayment.findMany({ include: { employee: true } }),
    prisma.businessExpense.findMany()
  ]);

  let transactions = [];

  // 1. Invoices (Accrual Inflow)
  for (const inv of invoices) {
    transactions.push({
      id: `TX-INV-${inv.id}`,
      referenceNumber: inv.invoiceNumber,
      date: inv.issueDate,
      type: 'BUYER_INVOICE',
      category: 'Sales Revenue (Invoiced)',
      partyName: inv.customer?.companyName || inv.customer?.name || 'Buyer',
      partyType: 'BUYER',
      description: `Invoice for ${inv.salesOrder?.orderNumber || 'Direct Order'}`,
      amount: inv.totalAmount,
      direction: 'INFLOW',
      accountingBasis: 'ACCRUAL',
      status: inv.status,
      sourceId: inv.id,
      sourceModel: 'Invoice'
    });
  }

  // 2. Buyer Payments (Cash Inflow)
  for (const p of buyerPayments) {
    transactions.push({
      id: `TX-PAY-${p.id}`,
      referenceNumber: p.paymentNumber,
      date: p.paymentDate,
      type: 'BUYER_PAYMENT',
      category: 'Buyer Payment Received',
      partyName: p.invoice?.customer?.companyName || p.invoice?.customer?.name || 'Buyer',
      partyType: 'BUYER',
      description: `Payment against ${p.invoice?.invoiceNumber || 'Invoice'} via ${p.paymentMethod}`,
      amount: p.amount,
      direction: 'INFLOW',
      accountingBasis: 'CASH',
      status: 'CLEARED',
      sourceId: p.id,
      sourceModel: 'BuyerPayment'
    });
  }

  // 3. Supplier Bills (Accrual Outflow)
  for (const b of bills) {
    transactions.push({
      id: `TX-BILL-${b.id}`,
      referenceNumber: b.billNumber,
      date: b.billDate,
      type: 'SUPPLIER_BILL',
      category: 'Raw Material Bill',
      partyName: b.supplier?.name || 'Supplier',
      partyType: 'SUPPLIER',
      description: `Supplier bill for ${b.purchaseOrder?.orderNumber || 'Materials'}`,
      amount: b.totalAmount,
      direction: 'OUTFLOW',
      accountingBasis: 'ACCRUAL',
      status: b.status,
      sourceId: b.id,
      sourceModel: 'SupplierBill'
    });
  }

  // 4. Supplier Payments (Cash Outflow)
  for (const sp of supplierPayments) {
    transactions.push({
      id: `TX-SPAY-${sp.id}`,
      referenceNumber: sp.paymentNumber,
      date: sp.paymentDate,
      type: 'SUPPLIER_PAYMENT',
      category: 'Supplier Payment Made',
      partyName: sp.bill?.supplier?.name || 'Supplier',
      partyType: 'SUPPLIER',
      description: `Payment against ${sp.bill?.billNumber || 'Bill'} via ${sp.paymentMethod}`,
      amount: sp.amount,
      direction: 'OUTFLOW',
      accountingBasis: 'CASH',
      status: 'CLEARED',
      sourceId: sp.id,
      sourceModel: 'SupplierPayment'
    });
  }

  // 5. Payroll Payments (Cash Outflow)
  for (const pp of payrollPayments) {
    transactions.push({
      id: `TX-PAYROLL-${pp.id}`,
      referenceNumber: pp.payoutNumber,
      date: pp.paidAt,
      type: 'PAYROLL_WAGE',
      category: 'Worker Wage Payout',
      partyName: pp.employee?.name || 'Floor Staff',
      partyType: 'EMPLOYEE',
      description: `Wages paid for ${pp.month} (${pp.totalShifts} shifts)`,
      amount: pp.amountPaid,
      direction: 'OUTFLOW',
      accountingBasis: 'CASH',
      status: 'PAID',
      sourceId: pp.id,
      sourceModel: 'PayrollPayment'
    });
  }

  // 6. Business Expenses (Cash Outflow)
  for (const exp of expenses) {
    transactions.push({
      id: `TX-EXP-${exp.id}`,
      referenceNumber: exp.expenseNumber,
      date: exp.expenseDate,
      type: 'BUSINESS_EXPENSE',
      category: exp.category,
      partyName: 'Factory Operations',
      partyType: 'INTERNAL',
      description: `Operating expense: ${exp.category}`,
      amount: exp.amount,
      direction: 'OUTFLOW',
      accountingBasis: 'CASH',
      status: 'PAID',
      sourceId: exp.id,
      sourceModel: 'BusinessExpense'
    });
  }

  // Filter by Type
  if (type && type !== 'ALL') {
    transactions = transactions.filter((t) => t.type === type);
  }

  // Filter by Date
  if (startDate) {
    const s = new Date(startDate);
    transactions = transactions.filter((t) => new Date(t.date) >= s);
  }
  if (endDate) {
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    transactions = transactions.filter((t) => new Date(t.date) <= e);
  }

  // Filter by Search Query
  if (search && search.trim()) {
    const q = search.toLowerCase();
    transactions = transactions.filter(
      (t) =>
        t.referenceNumber.toLowerCase().includes(q) ||
        t.partyName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }

  // Sort descending by date
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate summary totals
  const totalInvoicedRevenue = transactions
    .filter((t) => t.type === 'BUYER_INVOICE')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCashReceived = transactions
    .filter((t) => t.type === 'BUYER_PAYMENT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBilledExpenses = transactions
    .filter((t) => t.type === 'SUPPLIER_BILL')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCashPaid = transactions
    .filter((t) => t.type === 'SUPPLIER_PAYMENT' || t.type === 'PAYROLL_WAGE' || t.type === 'BUSINESS_EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    transactions,
    summary: {
      totalCount: transactions.length,
      totalInvoicedRevenue: Math.round(totalInvoicedRevenue * 100) / 100,
      totalCashReceived: Math.round(totalCashReceived * 100) / 100,
      totalBilledExpenses: Math.round(totalBilledExpenses * 100) / 100,
      totalCashPaid: Math.round(totalCashPaid * 100) / 100,
      netCashBalance: Math.round((totalCashReceived - totalCashPaid) * 100) / 100
    }
  };
}

// ==============================================================================
// 5. ORDER-LEVEL MANUFACTURING COSTING
// ==============================================================================

async function getOrderCosting(salesOrderId) {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
    include: {
      customer: true,
      items: { include: { product: true } },
      productionOrders: {
        include: {
          materialConsumptions: { include: { rawMaterial: true } },
          stageLogs: { include: { operator: true, machine: true } },
          inspections: true
        }
      },
      invoices: { include: { payments: true } }
    }
  });

  if (!salesOrder) {
    const err = new Error(`Sales order with ID ${salesOrderId} not found`);
    err.statusCode = 404;
    throw err;
  }

  // 1. Raw Material Costs
  let materialCost = 0;
  const materialBreakdown = [];

  for (const po of salesOrder.productionOrders) {
    for (const mc of po.materialConsumptions) {
      const qtyUsed = mc.actualQuantity > 0 ? mc.actualQuantity : mc.plannedQuantity;
      const unitCost = mc.rawMaterial?.unitCost || 0;
      const totalMatCost = Math.round(qtyUsed * unitCost * 100) / 100;
      materialCost += totalMatCost;

      materialBreakdown.push({
        rawMaterialId: mc.rawMaterialId,
        name: mc.rawMaterial?.name,
        code: mc.rawMaterial?.code,
        stage: mc.stage,
        quantity: qtyUsed,
        unit: mc.unit,
        unitCost,
        totalCost: totalMatCost
      });
    }
  }

  // 2. Direct Labor / Wage Allocation
  let laborCost = 0;
  const laborBreakdown = [];

  for (const po of salesOrder.productionOrders) {
    for (const log of po.stageLogs) {
      if (log.operator) {
        // Shift wage allocation: 1 stage log = allocated fraction of shift wage
        const wageRate = log.operator.wagePerShift || 500;
        const allocatedWage = Math.round(wageRate * 0.5 * 100) / 100; // estimated per-stage run
        laborCost += allocatedWage;

        laborBreakdown.push({
          operatorId: log.operatorId,
          operatorName: log.operator.name,
          role: log.operator.role,
          stage: log.stage,
          wageRate,
          allocatedCost: allocatedWage
        });
      }
    }
  }

  // 3. Totals and Margins
  const totalManufacturingCost = Math.round((materialCost + laborCost) * 100) / 100;
  const revenue = salesOrder.totalAmount;
  const grossProfit = Math.round((revenue - totalManufacturingCost) * 100) / 100;
  const marginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;

  // Invoiced & Paid info
  const totalInvoiced = salesOrder.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = salesOrder.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const balanceDue = Math.max(0, totalInvoiced - totalPaid);

  return {
    salesOrderId: salesOrder.id,
    orderNumber: salesOrder.orderNumber,
    orderReference: salesOrder.orderNumber,
    customerName: salesOrder.customer?.companyName || salesOrder.customer?.name,
    buyerName: salesOrder.customer?.companyName || salesOrder.customer?.name,
    orderStatus: salesOrder.status,
    revenue,
    agreedRevenue: revenue,
    materialCost: Math.round(materialCost * 100) / 100,
    materialCostIncurred: Math.round(materialCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    laborCostIncurred: Math.round(laborCost * 100) / 100,
    totalManufacturingCost,
    grossProfit,
    marginPct,
    grossMarginPercent: marginPct,
    financialStatus: {
      totalInvoiced,
      totalPaid,
      balanceDue,
      invoiceCount: salesOrder.invoices.length
    },
    materialBreakdown,
    laborBreakdown
  };
}

// ==============================================================================
// 6. OWNER FINANCIAL DASHBOARD & MONTH-END CLOSING
// ==============================================================================

async function getOwnerFinancialSummary(monthQuery = '') {
  // Determine month range: e.g. "2026-10" or current month
  let targetMonth = monthQuery;
  if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
    targetMonth = new Date().toISOString().slice(0, 7);
  }

  const [yearStr, monthStr] = targetMonth.split('-');
  const startOfMonth = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1, 0, 0, 0);
  const endOfMonth = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0, 23, 59, 59, 999);

  // Concurrently fetch records across the month
  const [
    invoices,
    buyerPayments,
    supplierBills,
    supplierPayments,
    attendances,
    payrollPayments,
    businessExpenses,
    salesOrders
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { issueDate: { gte: startOfMonth, lte: endOfMonth } },
      include: { customer: true }
    }),
    prisma.buyerPayment.findMany({
      where: { paymentDate: { gte: startOfMonth, lte: endOfMonth } }
    }),
    prisma.supplierBill.findMany({
      where: { billDate: { gte: startOfMonth, lte: endOfMonth } },
      include: { supplier: true }
    }),
    prisma.supplierPayment.findMany({
      where: { paymentDate: { gte: startOfMonth, lte: endOfMonth } }
    }),
    prisma.attendance.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } }
    }),
    prisma.payrollPayment.findMany({
      where: { month: targetMonth }
    }),
    prisma.businessExpense.findMany({
      where: { expenseDate: { gte: startOfMonth, lte: endOfMonth } }
    }),
    prisma.salesOrder.findMany({
      where: { orderDate: { gte: startOfMonth, lte: endOfMonth } }
    })
  ]);

  // All time unpaid balances for balance sheet / receivables / payables
  const [allInvoices, allBills] = await Promise.all([
    prisma.invoice.findMany({ select: { totalAmount: true, paidAmount: true, balanceDue: true } }),
    prisma.supplierBill.findMany({ select: { totalAmount: true, paidAmount: true, balanceDue: true } })
  ]);

  // Accrual Basis Metrics
  const invoicedRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const materialExpensesIncurred = supplierBills.reduce((sum, b) => sum + b.totalAmount, 0);
  const workerWagesCalculated = attendances.reduce((sum, a) => sum + (a.wageCalculated || 0), 0);
  const operatingExpenses = businessExpenses.reduce((sum, e) => sum + e.amount, 0);

  const accrualTotalExpenses = materialExpensesIncurred + workerWagesCalculated + operatingExpenses;
  const accrualNetProfit = invoicedRevenue - accrualTotalExpenses;
  const accrualMarginPct = invoicedRevenue > 0 ? (accrualNetProfit / invoicedRevenue) * 100 : 0;

  // Cash Basis Metrics
  const cashReceivedFromBuyers = buyerPayments.reduce((sum, p) => sum + p.amount, 0);
  const cashPaidToSuppliers = supplierPayments.reduce((sum, sp) => sum + sp.amount, 0);
  const cashWagesPaid = payrollPayments.reduce((sum, pp) => sum + pp.amountPaid, 0);
  const cashExpensesPaid = operatingExpenses;

  const totalCashOutflow = cashPaidToSuppliers + cashWagesPaid + cashExpensesPaid;
  const netCashFlow = cashReceivedFromBuyers - totalCashOutflow;

  // Outstanding Receivables & Payables
  const totalReceivables = allInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
  const totalPayables = allBills.reduce((sum, b) => sum + (b.balanceDue || 0), 0);

  // Month stats
  return {
    month: targetMonth,
    period: {
      startDate: startOfMonth.toISOString(),
      endDate: endOfMonth.toISOString()
    },
    accrualBasis: {
      title: 'Accrual Financial Performance (Earned Revenue vs Incurred Costs)',
      invoicedRevenue: Math.round(invoicedRevenue * 100) / 100,
      materialExpenses: Math.round(materialExpensesIncurred * 100) / 100,
      wagesCalculated: Math.round(workerWagesCalculated * 100) / 100,
      workerWagesCalculated: Math.round(workerWagesCalculated * 100) / 100,
      otherExpenses: Math.round(operatingExpenses * 100) / 100,
      operatingExpenses: Math.round(operatingExpenses * 100) / 100,
      totalExpenses: Math.round(accrualTotalExpenses * 100) / 100,
      netProfit: Math.round(accrualNetProfit * 100) / 100,
      profitMarginPct: Math.round(accrualMarginPct * 10) / 10,
      profitMarginPercent: Math.round(accrualMarginPct * 10) / 10,
      isProfitable: accrualNetProfit >= 0
    },
    cashBasis: {
      title: 'Cash Flow Performance (Actual Inflows vs Outflows)',
      cashReceived: Math.round(cashReceivedFromBuyers * 100) / 100,
      cashReceivedFromBuyers: Math.round(cashReceivedFromBuyers * 100) / 100,
      cashPaidSuppliers: Math.round(cashPaidToSuppliers * 100) / 100,
      cashPaidToSuppliers: Math.round(cashPaidToSuppliers * 100) / 100,
      cashWagesPaid: Math.round(cashWagesPaid * 100) / 100,
      cashPaidForWages: Math.round(cashWagesPaid * 100) / 100,
      cashOperatingExpenses: Math.round(cashExpensesPaid * 100) / 100,
      cashPaidForExpenses: Math.round(cashExpensesPaid * 100) / 100,
      totalCashOutflow: Math.round(totalCashOutflow * 100) / 100,
      netCashFlow: Math.round(netCashFlow * 100) / 100
    },
    workingCapital: {
      outstandingBuyerReceivables: Math.round(totalReceivables * 100) / 100,
      outstandingSupplierPayables: Math.round(totalPayables * 100) / 100,
      workingCapitalGap: Math.round((totalReceivables - totalPayables) * 100) / 100,
      unpaidWagesLiability: Math.round(Math.max(0, workerWagesCalculated - cashWagesPaid) * 100) / 100
    },
    balanceSheetSnapshot: {
      outstandingBuyerReceivables: Math.round(totalReceivables * 100) / 100,
      outstandingSupplierPayables: Math.round(totalPayables * 100) / 100,
      workingCapitalGap: Math.round((totalReceivables - totalPayables) * 100) / 100
    },
    counts: {
      newSalesOrders: salesOrders.length,
      invoicesIssued: invoices.length,
      billsReceived: supplierBills.length,
      shiftsWorked: attendances.length
    }
  };
}

module.exports = {
  createInvoice,
  listInvoices,
  getInvoiceById,
  recordBuyerPayment,
  createSupplierBill,
  listSupplierBills,
  recordSupplierPayment,
  recordPayrollPayment,
  listPayrollPayments,
  recordBusinessExpense,
  listBusinessExpenses,
  listCentralTransactions,
  getAllTransactions: listCentralTransactions,
  getOrderCosting,
  calculateOrderManufacturingCost: getOrderCosting,
  getOwnerFinancialSummary
};
