import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  Building2,
  Users,
  Receipt,
  PieChart,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export function OwnerFinanceView({ dbConnected, onOpenHealth, setActiveTab }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Order costing lookup
  const [costingOrderId, setCostingOrderId] = useState('');
  const [costingData, setCostingData] = useState(null);
  const [costingLoading, setCostingLoading] = useState(false);
  const [costingError, setCostingError] = useState(null);

  const fetchFinanceSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOwnerFinancialSummary({ month: selectedMonth });
      if (res?.data) {
        setSummary(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load month-end financial summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceSummary();
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(
      `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleLookupCosting = async (e) => {
    e?.preventDefault();
    if (!costingOrderId.trim()) return;
    setCostingLoading(true);
    setCostingError(null);
    try {
      const res = await api.getOrderCosting(costingOrderId.trim());
      if (res?.data) {
        setCostingData(res.data);
      }
    } catch (err) {
      setCostingError(err.message || 'Could not calculate costing for order');
      setCostingData(null);
    } finally {
      setCostingLoading(false);
    }
  };

  const accrual = summary?.accrualBasis || {};
  const cash = summary?.cashBasis || {};
  const isProfitable = (accrual.netProfit || 0) >= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DFEF]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#503568] to-[#7950A8] text-white flex items-center justify-center font-bold shadow-md shadow-[#7950A8]/20">
              <PieChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#292235] tracking-tight">
                Owner Financial Overview & Closing
              </h1>
              <p className="text-sm text-[#766D82]">
                Verified P&L, working capital snapshot, and order manufacturing margins.
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <button
            onClick={handlePrevMonth}
            className="p-1 text-[#503568] hover:bg-[#FAF7FC] rounded-lg cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 px-2 text-sm font-bold text-[#503568]">
            <Calendar className="w-4 h-4 text-[#7950A8]" />
            <span>{selectedMonth}</span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1 text-[#503568] hover:bg-[#FAF7FC] rounded-lg cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={fetchFinanceSummary}
            disabled={loading}
            className="ml-2 p-1 text-[#766D82] hover:text-[#503568] cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Accounting Methodology Callout */}
      <div className="bg-[#FAF7FC] border border-[#E8DFEF] rounded-2xl p-5 relative overflow-hidden">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-[#7950A8] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm text-[#503568]">
            <p className="font-bold text-[#292235]">
              Documented Accounting Basis (Strict Accrual + Cash Flow Separation)
            </p>
            <p className="text-[#766D82] leading-relaxed">
              • <strong className="text-[#503568]">Accrual P&L:</strong> Revenue is recognized upon issuance of official Buyer Sales Invoices. Operating expenses are recognized from recorded Supplier Bills, Worker Payroll earned, and Factory Expenses.
              <br />
              • <strong className="text-[#503568]">Cash Flow:</strong> Actual liquidity inflows (Buyer payments received) versus disbursements (Supplier settlements, wage payouts, overheads).
              <br />
              • <strong className="text-[#503568]">Integrity Rule:</strong> Purchase orders without goods receipts are never treated as material expenses or cash paid. Unsettled invoices are not treated as cash received.
            </p>
          </div>
        </div>
      </div>

      {/* Accrual P&L Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#292235]">
              Accrual Basis P&L ({selectedMonth})
            </h2>
            <p className="text-xs text-[#766D82]">
              Invoiced Earnings vs Incurred Factory Costs
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              isProfitable
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {isProfitable ? 'NET PROFIT' : 'NET OPERATING DEFICIT'} (Margin: {accrual.profitMarginPercent ?? 0}%)
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Revenue */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
            <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider block">
              Invoiced Revenue
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#292235] mt-2">
              ₹{accrual.invoicedRevenue?.toLocaleString('en-IN') || '0'}
            </p>
            <span className="text-[11px] text-[#766D82] mt-1 block">Sales Invoices Billed</span>
          </div>

          {/* Material Expenses */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
            <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider block">
              Material Costs (Billed)
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#503568] mt-2">
              ₹{accrual.materialExpenses?.toLocaleString('en-IN') || '0'}
            </p>
            <span className="text-[11px] text-[#766D82] mt-1 block">Yarn & Raw Material Bills</span>
          </div>

          {/* Wages */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
            <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider block">
              Worker Wages Earned
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#503568] mt-2">
              ₹{accrual.wagesCalculated?.toLocaleString('en-IN') || '0'}
            </p>
            <span className="text-[11px] text-[#766D82] mt-1 block">Attendance & Shift Wages</span>
          </div>

          {/* Factory Overheads */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
            <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider block">
              Factory Overheads
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#503568] mt-2">
              ₹{accrual.otherExpenses?.toLocaleString('en-IN') || '0'}
            </p>
            <span className="text-[11px] text-[#766D82] mt-1 block">Power, Spares & Freight</span>
          </div>

          {/* Net Profit */}
          <div
            className={`p-5 rounded-2xl border shadow-2xs col-span-2 lg:col-span-1 ${
              isProfitable
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/60 border-rose-200 text-rose-900'
            }`}
          >
            <span className="text-xs uppercase font-bold tracking-wider block">
              Net Profit / Loss
            </span>
            <p
              className={`text-2xl sm:text-3xl font-black mt-2 ${
                isProfitable ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              ₹{accrual.netProfit?.toLocaleString('en-IN') || '0'}
            </p>
            <span className="text-[11px] font-semibold mt-1 block">
              {isProfitable ? 'Operational Surplus' : 'Operating Deficit'}
            </span>
          </div>
        </div>
      </div>

      {/* Cash Flow & Working Capital Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Inflow vs Outflow */}
        <div className="bg-white rounded-2xl border border-[#E8DFEF] shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8DFEF]">
            <h3 className="font-bold text-base text-[#292235] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#7950A8]" />
              <span>Cash Flow & Liquidity (Real Movement)</span>
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEE5F7] text-[#503568]">
              Cash Basis
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7FC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#292235] block">Buyer Cash Received</span>
                  <span className="text-[11px] text-[#766D82]">Cleared Payments</span>
                </div>
              </div>
              <span className="font-bold text-emerald-700 text-sm">
                +₹{cash.cashReceivedFromBuyers?.toLocaleString('en-IN') || '0'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7FC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#292235] block">Supplier Cash Paid</span>
                  <span className="text-[11px] text-[#766D82]">Material Settlements</span>
                </div>
              </div>
              <span className="font-bold text-rose-700 text-sm">
                -₹{cash.cashPaidToSuppliers?.toLocaleString('en-IN') || '0'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7FC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#292235] block">Worker Wages Disbursed</span>
                  <span className="text-[11px] text-[#766D82]">Actual Paid Out</span>
                </div>
              </div>
              <span className="font-bold text-rose-700 text-sm">
                -₹{cash.cashPaidForWages?.toLocaleString('en-IN') || '0'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7FC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#292235] block">Cash Overheads Paid</span>
                  <span className="text-[11px] text-[#766D82]">Direct Expenses</span>
                </div>
              </div>
              <span className="font-bold text-rose-700 text-sm">
                -₹{cash.cashPaidForExpenses?.toLocaleString('en-IN') || '0'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E8DFEF] flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#766D82]">Net Cash Movement</span>
            <span
              className={`text-lg font-black ${
                (cash.netCashFlow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {(cash.netCashFlow || 0) >= 0 ? '+' : ''}₹
              {cash.netCashFlow?.toLocaleString('en-IN') || '0'}
            </span>
          </div>
        </div>

        {/* Working Capital Balances */}
        <div className="bg-white rounded-2xl border border-[#E8DFEF] shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8DFEF]">
            <h3 className="font-bold text-base text-[#292235] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#7950A8]" />
              <span>Receivables vs Payables (Working Capital)</span>
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              Outstanding Balances
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-indigo-100 bg-[#FAF7FC] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-indigo-900 tracking-wider">
                  Accounts Receivable (AR)
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  Buyers Owe Factory
                </span>
              </div>
              <p className="text-2xl font-black text-indigo-900">
                ₹{summary?.workingCapital?.outstandingBuyerReceivables?.toLocaleString('en-IN') || '0'}
              </p>
              <p className="text-xs text-[#766D82]">
                Total unsettled invoice balances across active buyers.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-100 bg-[#FAF7FC] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-amber-900 tracking-wider">
                  Accounts Payable (AP)
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Factory Owes Suppliers
                </span>
              </div>
              <p className="text-2xl font-black text-amber-900">
                ₹{summary?.workingCapital?.outstandingSupplierPayables?.toLocaleString('en-IN') || '0'}
              </p>
              <p className="text-xs text-[#766D82]">
                Unpaid supplier bills for received yarn cones and raw materials.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-purple-100 bg-[#FAF7FC] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-purple-900 tracking-wider">
                  Unpaid Worker Wages
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  Payroll Liability
                </span>
              </div>
              <p className="text-2xl font-black text-purple-900">
                ₹{summary?.workingCapital?.unpaidWagesLiability?.toLocaleString('en-IN') || '0'}
              </p>
              <p className="text-xs text-[#766D82]">
                Earned worker shift wages calculated minus actual disbursed amounts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order-Level Manufacturing Costing Explorer */}
      <div className="bg-white rounded-2xl border border-[#E8DFEF] shadow-2xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DFEF]">
          <div>
            <h3 className="font-bold text-lg text-[#292235] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#7950A8]" />
              <span>Order-Level Cost & Margin Inspector</span>
            </h3>
            <p className="text-xs text-[#766D82]">
              Verifiable costing derived from actual material consumption logs and shift labor allocation.
            </p>
          </div>
        </div>

        {/* Search input */}
        <form onSubmit={handleLookupCosting} className="flex gap-2 max-w-md">
          <input
            type="text"
            placeholder="Enter Sales Order ID or Order Reference (e.g. SO-2026-001)..."
            value={costingOrderId}
            onChange={(e) => setCostingOrderId(e.target.value)}
            className="flex-1 px-3 py-2 border border-[#E8DFEF] rounded-xl text-sm focus:border-[#7950A8] focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={costingLoading}
            className="px-4 py-2 bg-[#503568] text-white rounded-xl text-sm font-semibold hover:bg-[#3d2750] transition shadow-xs cursor-pointer disabled:opacity-60"
          >
            {costingLoading ? 'Calculating...' : 'Inspect Cost'}
          </button>
        </form>

        {costingError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
            {costingError}
          </div>
        )}

        {costingData && (
          <div className="bg-[#FAF7FC] p-5 rounded-2xl border border-[#E8DFEF] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8DFEF]">
              <div>
                <span className="font-bold text-base text-[#292235]">
                  {costingData.orderReference}
                </span>
                <span className="text-xs text-[#766D82] ml-2">
                  Buyer: <strong>{costingData.buyerName}</strong> ({costingData.quantity} {costingData.unit || 'meters'})
                </span>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  (costingData.grossMarginPercent || 0) >= 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                Gross Margin: {costingData.grossMarginPercent}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-xl border border-[#E8DFEF]">
                <span className="text-[11px] uppercase font-bold text-[#766D82]">Order Revenue</span>
                <p className="text-lg font-bold text-[#292235] mt-1">
                  ₹{costingData.agreedRevenue?.toLocaleString('en-IN') || '0'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E8DFEF]">
                <span className="text-[11px] uppercase font-bold text-[#766D82]">
                  Raw Material Cost
                </span>
                <p className="text-lg font-bold text-[#503568] mt-1">
                  ₹{costingData.materialCostIncurred?.toLocaleString('en-IN') || '0'}
                </p>
                <span className="text-[10px] text-[#766D82] block mt-0.5">
                  ({costingData.consumedMaterials?.length || 0} batches consumed)
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E8DFEF]">
                <span className="text-[11px] uppercase font-bold text-[#766D82]">
                  Allocated Labor Cost
                </span>
                <p className="text-lg font-bold text-[#503568] mt-1">
                  ₹{costingData.laborCostIncurred?.toLocaleString('en-IN') || '0'}
                </p>
                <span className="text-[10px] text-[#766D82] block mt-0.5">Production shift allocation</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E8DFEF]">
                <span className="text-[11px] uppercase font-bold text-[#766D82]">Gross Profit</span>
                <p
                  className={`text-lg font-bold mt-1 ${
                    (costingData.grossProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  ₹{costingData.grossProfit?.toLocaleString('en-IN') || '0'}
                </p>
              </div>
            </div>

            {/* Consumption Detail */}
            {costingData.consumedMaterials?.length > 0 && (
              <div className="mt-2 text-xs space-y-1">
                <span className="font-bold text-[#503568]">Material Consumption Detail:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {costingData.consumedMaterials.map((m, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-lg border border-[#E8DFEF] flex justify-between">
                      <span>{m.productName} ({m.quantity} {m.unit})</span>
                      <span className="font-semibold text-[#503568]">₹{m.totalCost?.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
