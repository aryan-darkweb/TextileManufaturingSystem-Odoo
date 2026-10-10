import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Calendar,
  CreditCard,
  Building2,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';
import { api } from '../services/api';

export function TransactionsView({ dbConnected, onOpenHealth }) {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isRecordBillOpen, setIsRecordBillOpen] = useState(false);
  const [isRecordExpenseOpen, setIsRecordExpenseOpen] = useState(false);

  // Forms
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierBills, setSupplierBills] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });
  const [billForm, setBillForm] = useState({
    supplierId: '',
    billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    subtotal: '',
    taxAmount: '0',
    notes: ''
  });
  const [expenseForm, setExpenseForm] = useState({
    category: 'FACTORY_MAINTENANCE',
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    reference: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (typeFilter && typeFilter !== 'ALL') params.type = typeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search) params.search = search;

      const res = await api.getTransactions(params);
      if (res?.data) {
        setTransactions(res.data.transactions || []);
        setSummary(res.data.summary || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch financial transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [invRes, suppRes, billsRes] = await Promise.all([
        api.getInvoices().catch(() => ({ data: [] })),
        api.getSuppliers().catch(() => ({ data: [] })),
        api.getSupplierBills().catch(() => ({ data: [] }))
      ]);
      setInvoices(invRes?.data || []);
      setSuppliers(suppRes?.data || []);
      setSupplierBills(billsRes?.data || []);
    } catch {
      // Ignore background ref loads
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, startDate, endDate]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        invoiceId: paymentForm.invoiceId,
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined
      };
      await api.recordBuyerPayment(payload);
      setActionSuccess('Buyer payment successfully recorded!');
      setIsRecordPaymentOpen(false);
      setPaymentForm({
        invoiceId: '',
        amount: '',
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: ''
      });
      fetchTransactions();
      loadReferenceData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordBill = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        supplierId: billForm.supplierId,
        billNumber: billForm.billNumber,
        billDate: billForm.billDate,
        dueDate: billForm.dueDate || undefined,
        subtotal: parseFloat(billForm.subtotal),
        taxAmount: parseFloat(billForm.taxAmount || 0),
        notes: billForm.notes || undefined
      };
      await api.createSupplierBill(payload);
      setActionSuccess('Supplier bill recorded successfully!');
      setIsRecordBillOpen(false);
      setBillForm({
        supplierId: '',
        billNumber: '',
        billDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        subtotal: '',
        taxAmount: '0',
        notes: ''
      });
      fetchTransactions();
      loadReferenceData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to record supplier bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        category: expenseForm.category,
        title: expenseForm.title,
        amount: parseFloat(expenseForm.amount),
        date: expenseForm.date,
        paymentMethod: expenseForm.paymentMethod,
        reference: expenseForm.reference || undefined,
        notes: expenseForm.notes || undefined
      };
      await api.recordBusinessExpense(payload);
      setActionSuccess('Business expense logged successfully!');
      setIsRecordExpenseOpen(false);
      setExpenseForm({
        category: 'FACTORY_MAINTENANCE',
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'BANK_TRANSFER',
        reference: '',
        notes: ''
      });
      fetchTransactions();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to log business expense');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadge = (type) => {
    switch (type) {
      case 'BUYER_PAYMENT':
        return {
          label: 'Buyer Payment Received',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: ArrowDownLeft,
          cashFlow: 'inflow'
        };
      case 'BUYER_INVOICE':
        return {
          label: 'Buyer Invoice',
          color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          icon: FileText,
          cashFlow: 'accrual'
        };
      case 'SUPPLIER_PAYMENT':
        return {
          label: 'Supplier Payment Made',
          color: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: ArrowUpRight,
          cashFlow: 'outflow'
        };
      case 'SUPPLIER_BILL':
        return {
          label: 'Supplier Bill',
          color: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: FileText,
          cashFlow: 'accrual'
        };
      case 'WAGE_PAYMENT':
        return {
          label: 'Worker Wage Paid',
          color: 'bg-purple-50 text-purple-800 border-purple-200',
          icon: User,
          cashFlow: 'outflow'
        };
      case 'BUSINESS_EXPENSE':
        return {
          label: 'Factory Expense',
          color: 'bg-stone-100 text-stone-800 border-stone-200',
          icon: Receipt,
          cashFlow: 'outflow'
        };
      default:
        return {
          label: type,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Receipt,
          cashFlow: 'neutral'
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DFEF]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEE5F7] text-[#503568] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5 text-[#7950A8]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#292235] tracking-tight">
                Central Financial Transactions
              </h1>
              <p className="text-sm text-[#766D82]">
                Unified audit ledger tracking real revenue, supplier disbursements, payroll, and expenses.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsRecordPaymentOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#7950A8] text-white rounded-xl text-sm font-semibold hover:bg-[#674191] transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Buyer Payment</span>
          </button>
          <button
            onClick={() => setIsRecordBillOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-[#503568] border border-[#E8DFEF] rounded-xl text-sm font-semibold hover:bg-[#FAF7FC] transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Supplier Bill</span>
          </button>
          <button
            onClick={() => setIsRecordExpenseOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-[#503568] border border-[#E8DFEF] rounded-xl text-sm font-semibold hover:bg-[#FAF7FC] transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Expense</span>
          </button>
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="p-2 border border-[#E8DFEF] bg-white rounded-xl hover:bg-[#FAF7FC] text-[#503568] transition cursor-pointer"
            title="Refresh Transactions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Invoiced Revenue</span>
            <FileText className="w-4 h-4 text-[#7950A8]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#292235] mt-2">
            ₹{summary?.totalInvoicedRevenue?.toLocaleString('en-IN') || '0'}
          </p>
          <span className="text-xs text-[#766D82] font-medium mt-1 inline-block">Accrual Sales Issued</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-emerald-700 tracking-wider">Cash Received</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2">
            ₹{summary?.totalCashReceived?.toLocaleString('en-IN') || '0'}
          </p>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">Actual Buyer Inflow</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-rose-700 tracking-wider">Total Cash Disbursed</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 mt-2">
            ₹{summary?.totalCashPaid?.toLocaleString('en-IN') || '0'}
          </p>
          <span className="text-xs text-rose-600 font-medium mt-1 inline-block">Suppliers + Wages + Expenses</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-indigo-700 tracking-wider">Net Cash Flow</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-2">
            ₹{summary?.netCashFlow?.toLocaleString('en-IN') || '0'}
          </p>
          <span className="text-xs text-indigo-600 font-medium mt-1 inline-block">Cash Inflows - Outflows</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DFEF] shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-[#766D82] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by transaction reference, buyer, supplier, worker or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E8DFEF] rounded-xl text-sm bg-[#FAF7FC] focus:bg-white focus:outline-hidden focus:border-[#7950A8]"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#FAF7FC] px-3 py-1.5 border border-[#E8DFEF] rounded-xl text-xs font-semibold text-[#503568]">
              <Calendar className="w-3.5 h-3.5 text-[#7950A8]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs focus:outline-hidden"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs focus:outline-hidden"
              />
            </div>

            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-[#766D82] hover:text-[#503568] px-2 py-1.5 font-medium underline"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <span className="text-[#766D82] font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Category:
          </span>
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'BUYER_PAYMENT', label: 'Buyer Payments' },
            { id: 'BUYER_INVOICE', label: 'Sales Invoices' },
            { id: 'SUPPLIER_BILL', label: 'Supplier Bills' },
            { id: 'SUPPLIER_PAYMENT', label: 'Supplier Payments' },
            { id: 'WAGE_PAYMENT', label: 'Payroll Payments' },
            { id: 'BUSINESS_EXPENSE', label: 'Factory Expenses' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setTypeFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer shrink-0 ${
                typeFilter === cat.id
                  ? 'bg-[#503568] text-white shadow-xs'
                  : 'bg-[#FAF7FC] text-[#503568] border border-[#E8DFEF] hover:bg-[#EEE5F7]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFEF] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E8DFEF] flex items-center justify-between">
          <h2 className="font-bold text-lg text-[#292235]">
            Ledger Records ({transactions.length})
          </h2>
          <span className="text-xs text-[#766D82]">
            Audited financial flow from operational events
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#766D82]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7950A8] mb-2" />
            <p className="text-sm font-medium">Loading ledger transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-[#766D82]">
            <Receipt className="w-10 h-10 mx-auto text-[#C3B2DB] mb-3" />
            <h3 className="font-bold text-base text-[#292235]">No Transactions Recorded</h3>
            <p className="text-sm mt-1 max-w-sm mx-auto">
              Transactions are recorded whenever invoices are issued, buyer or supplier payments are made, or wages are settled.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF7FC] text-[#766D82] text-xs uppercase font-bold border-b border-[#E8DFEF]">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Ref / Transaction ID</th>
                  <th className="py-3.5 px-4">Event Type</th>
                  <th className="py-3.5 px-4">Party</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Settlement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EEF8]">
                {transactions.map((tx) => {
                  const badge = getCategoryBadge(tx.type);
                  const isPositive = badge.cashFlow === 'inflow';
                  const isNegative = badge.cashFlow === 'outflow';

                  return (
                    <tr key={tx.id} className="hover:bg-[#FAF7FC] transition">
                      <td className="py-3 px-4 text-xs font-medium text-[#766D82] whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-[#503568] whitespace-nowrap">
                        {tx.reference}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}
                        >
                          <badge.icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#292235] whitespace-nowrap">
                        {tx.party || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#766D82] max-w-xs truncate">
                        {tx.description || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-sm whitespace-nowrap">
                        <span
                          className={
                            isPositive
                              ? 'text-emerald-700'
                              : isNegative
                              ? 'text-rose-700'
                              : 'text-[#292235]'
                          }
                        >
                          {isPositive && '+'}
                          {isNegative && '-'}₹{tx.amount?.toLocaleString('en-IN') || '0'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#EEE5F7] text-[#503568] border border-[#E8DFEF]">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Buyer Payment Modal */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E8DFEF] shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFEF]">
              <h3 className="text-lg font-bold text-[#292235] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#7950A8]" />
                <span>Record Buyer Payment</span>
              </h3>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="text-[#766D82] hover:text-[#292235]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                  Select Buyer Invoice *
                </label>
                <select
                  required
                  value={paymentForm.invoiceId}
                  onChange={(e) => {
                    const invId = e.target.value;
                    const selected = invoices.find((inv) => inv.id === invId);
                    setPaymentForm({
                      ...paymentForm,
                      invoiceId: invId,
                      amount: selected ? selected.balanceAmount.toString() : paymentForm.amount
                    });
                  }}
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                >
                  <option value="">-- Choose an unsettled invoice --</option>
                  {invoices
                    .filter((inv) => inv.status !== 'PAID')
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.customer?.name} (Bal: ₹
                        {inv.balanceAmount?.toLocaleString('en-IN')})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Bank Reference / UTR
                  </label>
                  <input
                    type="text"
                    placeholder="UTR / Check #"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#503568] uppercase mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Optional settlement notes..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2 border border-[#E8DFEF] rounded-xl text-sm font-semibold text-[#766D82] hover:bg-[#FAF7FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#7950A8] text-white rounded-xl text-sm font-semibold hover:bg-[#674191] transition shadow-xs disabled:opacity-60"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Supplier Bill Modal */}
      {isRecordBillOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E8DFEF] shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFEF]">
              <h3 className="text-lg font-bold text-[#292235] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#7950A8]" />
                <span>Record Inward Supplier Bill</span>
              </h3>
              <button
                onClick={() => setIsRecordBillOpen(false)}
                className="text-[#766D82] hover:text-[#292235]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordBill} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                  Supplier *
                </label>
                <select
                  required
                  value={billForm.supplierId}
                  onChange={(e) => setBillForm({ ...billForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || 'Supplier'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                  Supplier Invoice / Bill # *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-SUPP-8891"
                  value={billForm.billNumber}
                  onChange={(e) => setBillForm({ ...billForm, billNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={billForm.billDate}
                    onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={billForm.dueDate}
                    onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Subtotal (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={billForm.subtotal}
                    onChange={(e) => setBillForm({ ...billForm, subtotal: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Tax / GST (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={billForm.taxAmount}
                    onChange={(e) => setBillForm({ ...billForm, taxAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#503568] uppercase mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Material specs, receipt reference..."
                  value={billForm.notes}
                  onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordBillOpen(false)}
                  className="px-4 py-2 border border-[#E8DFEF] rounded-xl text-sm font-semibold text-[#766D82] hover:bg-[#FAF7FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#503568] text-white rounded-xl text-sm font-semibold hover:bg-[#3d2750] transition shadow-xs disabled:opacity-60"
                >
                  {submitting ? 'Recording...' : 'Create Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Business Expense Modal */}
      {isRecordExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E8DFEF] shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFEF]">
              <h3 className="text-lg font-bold text-[#292235] flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#7950A8]" />
                <span>Log Factory / Overhead Expense</span>
              </h3>
              <button
                onClick={() => setIsRecordExpenseOpen(false)}
                className="text-[#766D82] hover:text-[#292235]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                  Expense Category *
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                >
                  <option value="FACTORY_MAINTENANCE">Machine Maintenance & Spares</option>
                  <option value="ELECTRICITY_UTILITIES">Electricity & Factory Power</option>
                  <option value="DYES_CHEMICALS">Dyes, Auxiliary Chemicals & Steam</option>
                  <option value="LOGISTICS_TRANSPORT">Truck Freight & Logistics</option>
                  <option value="OFFICE_ADMIN">Administrative & Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                  Expense Description / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Loom Belt Replacement, HT Electricity Bill"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#503568] uppercase mb-1">
                    Reference / Receipt #
                  </label>
                  <input
                    type="text"
                    placeholder="Bill / Voucher #"
                    value={expenseForm.reference}
                    onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordExpenseOpen(false)}
                  className="px-4 py-2 border border-[#E8DFEF] rounded-xl text-sm font-semibold text-[#766D82] hover:bg-[#FAF7FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#7950A8] text-white rounded-xl text-sm font-semibold hover:bg-[#674191] transition shadow-xs disabled:opacity-60"
                >
                  {submitting ? 'Logging...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
