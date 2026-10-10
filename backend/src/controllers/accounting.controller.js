const accountingService = require('../services/accounting.service');
const { success } = require('../utils/apiResponse');

const created = (res, data, message) => success(res, data, message, 201);

async function createInvoice(req, res, next) {
  try {
    const invoice = await accountingService.createInvoice(req.body);
    return created(res, invoice, 'Sales invoice created successfully');
  } catch (err) {
    next(err);
  }
}

async function getInvoices(req, res, next) {
  try {
    const invoices = await accountingService.listInvoices(req.query);
    return success(res, invoices, 'Invoices retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getInvoiceById(req, res, next) {
  try {
    const invoice = await accountingService.getInvoiceById(req.params.id);
    return success(res, invoice, 'Invoice retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function recordBuyerPayment(req, res, next) {
  try {
    const payment = await accountingService.recordBuyerPayment(req.body);
    return created(res, payment, 'Buyer payment recorded successfully');
  } catch (err) {
    next(err);
  }
}

async function createSupplierBill(req, res, next) {
  try {
    const bill = await accountingService.createSupplierBill(req.body);
    return created(res, bill, 'Supplier bill recorded successfully');
  } catch (err) {
    next(err);
  }
}

async function getSupplierBills(req, res, next) {
  try {
    const bills = await accountingService.listSupplierBills(req.query);
    return success(res, bills, 'Supplier bills retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function recordSupplierPayment(req, res, next) {
  try {
    const payment = await accountingService.recordSupplierPayment(req.body);
    return created(res, payment, 'Supplier payment recorded successfully');
  } catch (err) {
    next(err);
  }
}

async function recordPayrollPayment(req, res, next) {
  try {
    const payment = await accountingService.recordPayrollPayment(req.body);
    return created(res, payment, 'Payroll payout recorded successfully');
  } catch (err) {
    next(err);
  }
}

async function getPayrollPayments(req, res, next) {
  try {
    const payments = await accountingService.listPayrollPayments(req.query);
    return success(res, payments, 'Payroll payments retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function recordBusinessExpense(req, res, next) {
  try {
    const expense = await accountingService.recordBusinessExpense(req.body);
    return created(res, expense, 'Business expense recorded successfully');
  } catch (err) {
    next(err);
  }
}

async function getBusinessExpenses(req, res, next) {
  try {
    const expenses = await accountingService.listBusinessExpenses(req.query);
    return success(res, expenses, 'Business expenses retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getCentralTransactions(req, res, next) {
  try {
    const data = await accountingService.listCentralTransactions(req.query);
    return success(res, data, 'Central transactions feed retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getOrderCosting(req, res, next) {
  try {
    const costing = await accountingService.getOrderCosting(req.params.salesOrderId);
    return success(res, costing, 'Order manufacturing costing retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getOwnerFinancialSummary(req, res, next) {
  try {
    const summary = await accountingService.getOwnerFinancialSummary(req.query.month);
    return success(res, summary, 'Owner month-end financial summary retrieved successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  recordBuyerPayment,
  createSupplierBill,
  getSupplierBills,
  recordSupplierPayment,
  recordPayrollPayment,
  getPayrollPayments,
  recordBusinessExpense,
  getBusinessExpenses,
  getCentralTransactions,
  getOrderCosting,
  getOwnerFinancialSummary
};
