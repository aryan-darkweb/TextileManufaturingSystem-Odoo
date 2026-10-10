const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accounting.controller');
const { validateBody } = require('../middleware/validate');

function validateInvoice(body) {
  if (!body.customerId && !body.salesOrderId) {
    return 'Either customerId or salesOrderId is required';
  }
  return null;
}

function validateBuyerPayment(body) {
  if (!body.invoiceId) return 'invoiceId is required';
  if (!body.amount || Number(body.amount) <= 0) return 'Valid positive amount is required';
  return null;
}

function validateSupplierBill(body) {
  if (!body.supplierId && !body.purchaseOrderId) {
    return 'Either supplierId or purchaseOrderId is required';
  }
  return null;
}

function validateSupplierPayment(body) {
  if (!body.billId) return 'billId is required';
  if (!body.amount || Number(body.amount) <= 0) return 'Valid positive amount is required';
  return null;
}

function validatePayroll(body) {
  if (!body.month) return 'Payroll month is required (YYYY-MM)';
  if (!body.amountPaid || Number(body.amountPaid) <= 0) return 'Valid positive amountPaid is required';
  return null;
}

// Invoices & Buyer Payments
router.get('/invoices', accountingController.getInvoices);
router.post('/invoices', validateBody(validateInvoice), accountingController.createInvoice);
router.get('/invoices/:id', accountingController.getInvoiceById);
router.post('/payments/buyer', validateBody(validateBuyerPayment), accountingController.recordBuyerPayment);

// Supplier Bills & Supplier Payments
router.get('/bills', accountingController.getSupplierBills);
router.post('/bills', validateBody(validateSupplierBill), accountingController.createSupplierBill);
router.post('/payments/supplier', validateBody(validateSupplierPayment), accountingController.recordSupplierPayment);

// Payroll & Expenses
router.get('/payroll/payouts', accountingController.getPayrollPayments);
router.post('/payroll/payout', validateBody(validatePayroll), accountingController.recordPayrollPayment);
router.get('/expenses', accountingController.getBusinessExpenses);
router.post('/expenses', accountingController.recordBusinessExpense);

// Central Transactions Feed & Analytics
router.get('/', accountingController.getCentralTransactions);
router.get('/transactions', accountingController.getCentralTransactions);
router.get('/costing/by-order/:salesOrderId', accountingController.getOrderCosting);
router.get('/summary/month-end', accountingController.getOwnerFinancialSummary);

module.exports = router;
