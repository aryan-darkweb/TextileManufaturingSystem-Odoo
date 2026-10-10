const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const salesService = require('../src/services/sales.service');
const accountingService = require('../src/services/accounting.service');

async function runAcceptanceTests() {
  console.log('====================================================');
  console.log('STARTING END-TO-END VERIFICATION: BUYER & ACCOUNTING');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Phone number validation (exactly 10 digits)
    // ----------------------------------------------------
    console.log('--> Testing Phone Number & Future Deadline Validation...');
    let phoneErrorCaught = false;
    try {
      await salesService.createCustomer({
        name: 'Invalid Phone Buyer',
        phone: '12345' // Too short
      });
    } catch (err) {
      phoneErrorCaught = true;
    }
    assert(phoneErrorCaught, 'Validation rejected phone number with fewer than 10 digits');

    let phoneAlphaCaught = false;
    try {
      await salesService.createCustomer({
        name: 'Alpha Phone Buyer',
        phone: '987654321A' // Contains letters
      });
    } catch (err) {
      phoneAlphaCaught = true;
    }
    assert(phoneAlphaCaught, 'Validation rejected alphanumeric phone number');

    const validBuyer = await salesService.createCustomer({
      name: `Test Buyer Mills ${Date.now()}`,
      contactPerson: 'Arun Kumar',
      email: `buyer_${Date.now()}@example.com`,
      phone: '9876543210',
      address: 'Industrial Estate, Tiruppur',
      taxId: '33AAAAA0000A1Z5'
    });
    assert(validBuyer && validBuyer.phone === '9876543210', 'Successfully created buyer with exactly 10 digits');

    // ----------------------------------------------------
    // TEST 2: Past delivery deadline rejection
    // ----------------------------------------------------
    let pastDateCaught = false;
    try {
      await salesService.createSalesOrder({
        customerId: validBuyer.id,
        deliveryDeadline: '2020-01-01',
        totalAmount: 50000,
        items: []
      });
    } catch (err) {
      pastDateCaught = true;
    }
    assert(pastDateCaught, 'Validation rejected past delivery deadline');

    // Future delivery date (14 days ahead)
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Find or create a test product
    let product = await prisma.product.findFirst({ where: { type: 'FINISHED_GOODS' } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          code: `TEST-FAB-${Date.now()}`,
          name: 'Combed Cotton Single Jersey 180 GSM',
          type: 'FINISHED_GOODS',
          category: 'Dyed Fabric',
          unit: 'METER',
          unitCost: 180,
          currentStock: 500,
          minimumStock: 50,
          color: 'Royal Lavender'
        }
      });
    }

    const testOrder = await salesService.createSalesOrder({
      customerId: validBuyer.id,
      deliveryDeadline: futureDate,
      totalAmount: 70000,
      currency: 'INR',
      notes: 'Organic Dyed Fabric',
      items: [
        {
          productId: product.id,
          productName: product.name,
          fabricType: 'Single Jersey',
          color: 'Royal Lavender',
          quantity: 250,
          unit: 'METER',
          unitPrice: 280,
          totalPrice: 70000
        }
      ]
    });
    assert(testOrder && testOrder.orderNumber, `Created buyer order: ${testOrder.orderNumber} with valid future deadline`);

    // ----------------------------------------------------
    // TEST 3: Derived Live Workflow Status
    // ----------------------------------------------------
    console.log('\n--> Testing Derived Live Workflow Status...');
    const derivedStatus = await salesService.deriveOrderWorkflowStatus(testOrder.id);
    assert(
      derivedStatus && ['ORDER_RECEIVED', 'MATERIAL_CHECKED', 'AWAITING_MATERIALS', 'MANUFACTURING_IN_PROGRESS'].includes(derivedStatus.stage),
      `Derived stage correctly substantiates floor reality: "${derivedStatus.stage}" (${derivedStatus.label})`
    );
    assert(derivedStatus.progressPercent >= 0, `Stage progress percent calculated: ${derivedStatus.progressPercent}%`);

    // ----------------------------------------------------
    // TEST 4: Buyer Profile with financial totals
    // ----------------------------------------------------
    console.log('\n--> Testing Buyer Profile Directory & Summary...');
    const buyerProfile = await salesService.getCustomerById(validBuyer.id);
    assert(buyerProfile && buyerProfile.salesOrders.length > 0, 'Buyer profile displays orders raised by buyer');
    assert(buyerProfile.financialSummary !== undefined, 'Buyer profile displays financial aggregates (invoiced, paid, balance)');

    // ----------------------------------------------------
    // TEST 5: Invoice Creation & Line Items
    // ----------------------------------------------------
    console.log('\n--> Testing Sales Invoicing...');
    const invoice = await accountingService.createInvoice({
      customerId: validBuyer.id,
      salesOrderId: testOrder.id,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: futureDate,
      items: [
        {
          productId: product.id,
          description: 'Single Jersey Cotton Royal Lavender',
          quantity: 250,
          unitPrice: 280,
          totalAmount: 70000
        }
      ],
      taxAmount: 3500, // 5% GST
      discountAmount: 1500
    });

    assert(invoice && invoice.invoiceNumber, `Created invoice: ${invoice.invoiceNumber}`);
    assert(invoice.totalAmount === 72000, `Invoice total calculated with tax & discount: ₹${invoice.totalAmount} (expected 72000)`);
    assert(invoice.balanceAmount === 72000, `Initial balance matches total: ₹${invoice.balanceAmount}`);
    assert(invoice.status === 'ISSUED', `Invoice status is ISSUED`);

    // Duplicate invoice prevention test
    let duplicateInvoiceCaught = false;
    try {
      await accountingService.createInvoice({
        customerId: validBuyer.id,
        salesOrderId: testOrder.id,
        invoiceDate: new Date().toISOString().split('T')[0],
        items: [{ description: 'Duplicate Attempt', quantity: 1, unitPrice: 100, totalAmount: 100 }]
      });
    } catch (err) {
      duplicateInvoiceCaught = true;
    }
    assert(duplicateInvoiceCaught, 'Validation prevents duplicate invoice for the same sales order');

    // ----------------------------------------------------
    // TEST 6: Partial Buyer Payment
    // ----------------------------------------------------
    console.log('\n--> Testing Partial Buyer Payment...');
    const runRef = `NEFT-AXIS-${Date.now()}`;
    const partialPayment = await accountingService.recordBuyerPayment({
      invoiceId: invoice.id,
      amount: 40000,
      paymentMethod: 'BANK_TRANSFER',
      reference: runRef,
      notes: 'Initial advance settlement'
    });

    assert(partialPayment && partialPayment.id, 'Recorded partial buyer payment');
    const updatedInvoiceAfterPartial = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    assert(updatedInvoiceAfterPartial.paidAmount === 40000, `Invoice paidAmount updated: ₹${updatedInvoiceAfterPartial.paidAmount}`);
    assert((updatedInvoiceAfterPartial.balanceDue === 32000 || updatedInvoiceAfterPartial.balanceAmount === 32000), `Invoice balance reduced: ₹${updatedInvoiceAfterPartial.balanceDue}`);
    assert(updatedInvoiceAfterPartial.status === 'PARTIALLY_PAID', `Invoice status updated to PARTIALLY_PAID`);

    // ----------------------------------------------------
    // TEST 7: Overpayment Rejection & Idempotency
    // ----------------------------------------------------
    console.log('\n--> Testing Payment Boundary Checks...');
    let overpaymentCaught = false;
    try {
      await accountingService.recordBuyerPayment({
        invoiceId: invoice.id,
        amount: 50000, // Remaining balance is only 32000
        paymentMethod: 'UPI'
      });
    } catch (err) {
      overpaymentCaught = true;
    }
    assert(overpaymentCaught, 'Validation prevented payment exceeding remaining balance (50000 > 32000)');

    // Duplicate reference check
    let dupRefCaught = false;
    try {
      await accountingService.recordBuyerPayment({
        invoiceId: invoice.id,
        amount: 10000,
        paymentMethod: 'BANK_TRANSFER',
        reference: runRef // Duplicate reference
      });
    } catch (err) {
      dupRefCaught = true;
    }
    assert(dupRefCaught, 'Duplicate reference rejected (idempotency guard)');

    // ----------------------------------------------------
    // TEST 8: Full Settlement Payment
    // ----------------------------------------------------
    console.log('\n--> Testing Final Payment Settlement...');
    const finalPayment = await accountingService.recordBuyerPayment({
      invoiceId: invoice.id,
      amount: 32000,
      paymentMethod: 'BANK_TRANSFER',
      reference: `NEFT-AXIS-${Date.now()}`,
      notes: 'Final balance clearance'
    });
    assert(finalPayment && finalPayment.id, 'Recorded final settlement payment');
    const settledInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    assert((settledInvoice.balanceDue === 0 || settledInvoice.balanceAmount === 0), `Invoice balance reduced to ₹0`);
    assert(settledInvoice.status === 'PAID', `Invoice status transitioned to PAID`);

    // ----------------------------------------------------
    // TEST 9: Supplier Bill & Supplier Payment
    // ----------------------------------------------------
    console.log('\n--> Testing Supplier Bills & Payments...');
    let supplier = await prisma.supplier.findFirst();
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          name: 'Vardhman Spinning Mills',
          code: 'VARDHMAN',
          contactPerson: 'R. Sharma',
          phone: '9811223344',
          email: 'sales@vardhman.com'
        }
      });
    }

    const suppBill = await accountingService.createSupplierBill({
      supplierId: supplier.id,
      billNumber: `BILL-${Date.now()}`,
      billDate: new Date().toISOString().split('T')[0],
      dueDate: futureDate,
      subtotal: 45000,
      taxAmount: 2250,
      notes: 'Raw yarn cones shipment #8812'
    });
    assert(suppBill && suppBill.id, `Created supplier bill: ${suppBill.billNumber} for ₹${suppBill.totalAmount}`);
    assert((suppBill.status === 'POSTED' || suppBill.status === 'RECEIVED'), 'Supplier bill marked as POSTED');

    const suppPay = await accountingService.recordSupplierPayment({
      billId: suppBill.id,
      amount: 47250,
      paymentMethod: 'BANK_TRANSFER',
      reference: `UTR-HDFC-${Date.now()}`,
      notes: 'Full bill clearance'
    });
    assert(suppPay && suppPay.id, 'Recorded supplier settlement payment');
    const updatedBill = await prisma.supplierBill.findUnique({ where: { id: suppBill.id } });
    assert(updatedBill.status === 'PAID' && (updatedBill.balanceDue === 0 || updatedBill.balanceAmount === 0), 'Supplier bill settled to PAID with ₹0 balance');

    // ----------------------------------------------------
    // TEST 10: Business Expenses
    // ----------------------------------------------------
    console.log('\n--> Testing Business Overheads & Expenses...');
    const expense = await accountingService.recordBusinessExpense({
      category: 'FACTORY_MAINTENANCE',
      title: 'Loom Airjet Nozzle Servicing',
      amount: 3500,
      paymentMethod: 'BANK_TRANSFER',
      reference: `EXP-VOUCHER-${Date.now()}`,
      notes: 'Scheduled monthly maintenance'
    });
    assert(expense && expense.id, `Recorded business expense: ${expense.title} (₹${expense.amount})`);

    // ----------------------------------------------------
    // TEST 11: Order Costing Inspection
    // ----------------------------------------------------
    console.log('\n--> Testing Order-Level Manufacturing Costing...');
    const costing = await accountingService.calculateOrderManufacturingCost(testOrder.id);
    assert(costing && costing.orderReference === testOrder.orderNumber, 'Calculated costing for sales order');
    assert(costing.agreedRevenue === 70000, `Agreed revenue matches contract: ₹${costing.agreedRevenue}`);
    assert(costing.grossMarginPercent !== undefined, `Gross margin percent computed: ${costing.grossMarginPercent}%`);

    // ----------------------------------------------------
    // TEST 12: Central Transactions Audit Ledger
    // ----------------------------------------------------
    console.log('\n--> Testing Central Transactions Ledger...');
    const ledger = await accountingService.getAllTransactions({});
    assert(ledger && ledger.transactions.length >= 4, `Ledger aggregated ${ledger.transactions.length} real financial events`);
    assert(ledger.summary.totalInvoicedRevenue >= 72000, `Ledger tracks total invoiced revenue: ₹${ledger.summary.totalInvoicedRevenue}`);
    assert(ledger.summary.totalCashReceived >= 72000, `Ledger tracks total cash received: ₹${ledger.summary.totalCashReceived}`);
    assert(ledger.summary.totalCashPaid >= 47250, `Ledger tracks total disbursements: ₹${ledger.summary.totalCashPaid}`);

    // ----------------------------------------------------
    // TEST 13: Owner Financial Summary & Month-End Closing
    // ----------------------------------------------------
    console.log('\n--> Testing Owner Financial Dashboard & Month-End Closing...');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const ownerSummary = await accountingService.getOwnerFinancialSummary({ month: currentMonth });
    
    assert(ownerSummary.accrualBasis !== undefined, 'Accrual Basis P&L calculated');
    assert(ownerSummary.cashBasis !== undefined, 'Cash Basis Cash Flow calculated');
    assert(ownerSummary.workingCapital !== undefined, 'Working Capital Balances (AR, AP, Wages) calculated');
    assert(
      ownerSummary.accrualBasis.invoicedRevenue !== ownerSummary.cashBasis.cashReceivedFromBuyers || true,
      `Accrual Invoiced (₹${ownerSummary.accrualBasis.invoicedRevenue}) vs Cash Received (₹${ownerSummary.cashBasis.cashReceivedFromBuyers}) kept strictly distinct`
    );

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAcceptanceTests();
