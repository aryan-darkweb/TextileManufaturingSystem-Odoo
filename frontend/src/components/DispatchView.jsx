import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle,
  X,
  Calendar,
  Layers,
  FileText,
  User,
  Phone,
  ArrowRight,
  ShieldAlert,
  CheckCheck
} from 'lucide-react';
import { api } from '../services/api';

export function DispatchView({ dbConnected, onOpenHealth }) {
  const [dispatchRecords, setDispatchRecords] = useState([]);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State: Create Dispatch
  const [dispatchForm, setDispatchForm] = useState({
    salesOrderId: '',
    vehicleNumber: 'GJ-05-TX-9921',
    driverName: 'Mohan Lal',
    driverPhone: '+91 98251 44550',
    destination: 'Apex Apparels Warehouse, Surat',
    invoiceNumber: '',
    dispatchedRollCount: '',
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [dispatchesRes, eligibleRes] = await Promise.allSettled([
        api.getDispatches(),
        api.getEligibleDispatchOrders(),
      ]);

      if (dispatchesRes.status === 'fulfilled' && dispatchesRes.value?.data) {
        setDispatchRecords(dispatchesRes.value.data);
      }
      if (eligibleRes.status === 'fulfilled' && eligibleRes.value?.data) {
        setEligibleOrders(eligibleRes.value.data);
        if (eligibleRes.value.data.length > 0 && !dispatchForm.salesOrderId) {
          const first = eligibleRes.value.data[0];
          setDispatchForm((prev) => ({
            ...prev,
            salesOrderId: first.id,
            destination: first.customer?.address || 'Buyer Warehouse, Industrial Area',
            invoiceNumber: `INV-${new Date().getFullYear()}-${first.orderNumber.replace('SO-', '')}`,
            dispatchedRollCount: String(first.items?.length * 5 || 10),
          }));
          setSelectedOrder(first);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch dispatch records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectOrder = (orderId) => {
    const ord = eligibleOrders.find((o) => o.id === orderId);
    setSelectedOrder(ord);
    setDispatchForm((prev) => ({
      ...prev,
      salesOrderId: orderId,
      destination: ord?.customer?.address || prev.destination,
      invoiceNumber: ord ? `INV-${new Date().getFullYear()}-${ord.orderNumber.replace('SO-', '')}` : prev.invoiceNumber,
      dispatchedRollCount: ord ? String(ord.items?.length * 5 || 10) : prev.dispatchedRollCount,
    }));
  };

  const handleOpenDispatchForOrder = (order) => {
    setSelectedOrder(order);
    setDispatchForm({
      salesOrderId: order.id,
      vehicleNumber: 'GJ-05-TX-9921',
      driverName: 'Mohan Lal',
      driverPhone: '+91 98251 44550',
      destination: order.customer?.address || 'Buyer Delivery Destination',
      invoiceNumber: `INV-${new Date().getFullYear()}-${order.orderNumber.replace('SO-', '')}`,
      dispatchedRollCount: String(order.items?.length * 5 || 10),
    });
    setIsDispatchModalOpen(true);
  };

  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!dispatchForm.salesOrderId) {
        throw new Error('Please select an eligible sales order');
      }

      const res = await api.createDispatch(dispatchForm);
      setSuccessMsg(
        `Dispatch ${res?.data?.dispatchNumber || ''} confirmed! Warehouse stock deducted and order marked as DISPATCHED.`
      );
      setIsDispatchModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Error executing dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDispatches = dispatchRecords.filter((d) => {
    const matchesSearch =
      d.dispatchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.salesOrder?.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.salesOrder?.customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#292235]">Dispatch & Logistics</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EEE5F7] text-[#503568] border border-[#DFCFF0]">
              Gate-Out & Shipping
            </span>
          </div>
          <p className="text-xs text-[#766D82] mt-1">
            Verify order line items, check finished goods stock, dispatch delivery trucks, and update warehouse records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-[#E8DFEF] bg-white rounded-lg hover:bg-[#FAF7FC] text-[#503568] transition cursor-pointer"
            title="Refresh Dispatch Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          </button>
          <button
            onClick={() => setIsDispatchModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Gate-Out Dispatch</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice:</p>
              <p>{errorMsg}</p>
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section 1: Orders Eligible for Dispatch */}
      <div className="bg-white rounded-xl border border-[#E8DFEF] p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#292235] flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-[#7950A8]" /> Orders Eligible for Dispatch ({eligibleOrders.length})
            </h2>
            <p className="text-[11px] text-[#766D82]">
              Sales orders pending transport delivery. Click "Dispatch Order" to confirm gate-out and deduct stock.
            </p>
          </div>
        </div>

        {eligibleOrders.length === 0 ? (
          <div className="p-4 bg-[#FAF7FC] rounded-lg text-center text-xs text-[#766D82] border border-[#E8DFEF]">
            No sales orders currently awaiting dispatch. Orders marked as CONFIRMED, IN_PRODUCTION, or READY_TO_SHIP will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {eligibleOrders.map((ord) => {
              const hasInsufficientStock = ord.items?.some((i) => i.product.currentStock < i.quantity);
              return (
                <div
                  key={ord.id}
                  className="p-3.5 rounded-xl border border-[#E8DFEF] bg-[#FAF7FC] hover:border-[#7950A8] transition-all flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#503568] text-xs">{ord.orderNumber}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEE5F7] text-[#503568] border border-[#DFCFF0]">
                        {ord.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-[#292235] mt-1">
                      {ord.customer?.companyName || ord.customer?.name}
                    </div>
                    <div className="text-[11px] text-[#766D82] mt-0.5">
                      Deadline: {new Date(ord.deliveryDeadline).toLocaleDateString()}
                    </div>

                    <div className="mt-2 text-[11px] space-y-1 border-t border-[#E8DFEF] pt-2">
                      {ord.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[#766D82]">
                          <span>{it.fabricType} ({it.quantity} {it.product.unit})</span>
                          <span
                            className={`font-semibold ${
                              it.product.currentStock < it.quantity ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            Stock: {it.product.currentStock}
                          </span>
                        </div>
                      ))}
                    </div>

                    {hasInsufficientStock && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>Insufficient stock to dispatch</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenDispatchForOrder(ord)}
                    disabled={hasInsufficientStock}
                    className="w-full mt-2 py-1.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg text-xs font-semibold shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatch Order</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Dispatch History Records */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#292235]">Dispatch History & Invoices</h2>
            <p className="text-[11px] text-[#766D82]">Historical shipments with verified vehicle numbers and stock deduction logs</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#766D82] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search dispatch or truck #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E8DFEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7950A8] bg-white"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E8DFEF] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7FC] border-b border-[#E8DFEF] text-[#766D82] uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Dispatch #</th>
                  <th className="py-3 px-4">Sales Order</th>
                  <th className="py-3 px-4">Buyer Customer</th>
                  <th className="py-3 px-4">Vehicle / Driver</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Rolls</th>
                  <th className="py-3 px-4">Date Dispatched</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EEF8]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#766D82]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#7950A8]" />
                      Loading dispatch history...
                    </td>
                  </tr>
                ) : filteredDispatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#766D82]">
                      No dispatch records found. Use the section above to dispatch eligible sales orders.
                    </td>
                  </tr>
                ) : (
                  filteredDispatches.map((d) => (
                    <tr key={d.id} className="hover:bg-[#FAF7FC] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#503568]">{d.dispatchNumber}</td>
                      <td className="py-3 px-4 font-mono text-[#292235]">{d.salesOrder?.orderNumber}</td>
                      <td className="py-3 px-4 font-semibold text-[#292235]">
                        {d.salesOrder?.customer?.companyName || d.salesOrder?.customer?.name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#292235]">{d.vehicleNumber}</div>
                        <div className="text-[11px] text-[#766D82]">{d.driverName || 'Driver'} {d.driverPhone ? `(${d.driverPhone})` : ''}</div>
                      </td>
                      <td className="py-3 px-4 text-[#766D82] max-w-xs truncate" title={d.destination}>
                        {d.destination}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#292235]">{d.dispatchedRollCount} rolls</td>
                      <td className="py-3 px-4 text-[#766D82]">
                        {d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleDateString() : new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Confirm Gate-Out Dispatch */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#E8DFEF] text-[#292235]">
            <div className="px-6 py-4 border-b border-[#E8DFEF] flex items-center justify-between bg-[#FAF7FC]">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-sm text-[#292235]">Confirm Truck Gate-Out Dispatch</h3>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-1 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="p-6 space-y-4 text-xs">
              {/* Sales Order Selection */}
              <div>
                <label className="block font-semibold text-[#292235] mb-1">Select Sales Order to Dispatch *</label>
                <select
                  value={dispatchForm.salesOrderId}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                >
                  {eligibleOrders.length === 0 ? (
                    <option value="">No eligible orders ready for dispatch</option>
                  ) : (
                    eligibleOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} — {o.customer?.companyName || o.customer?.name} ({o.items?.length} items)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedOrder && (
                <div className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] text-xs space-y-1">
                  <span className="font-bold text-[#503568]">Order Items to be Deducted:</span>
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-[#766D82]">
                      <span>{it.fabricType} ({it.quantity} {it.product.unit})</span>
                      <span className="font-semibold text-emerald-800">Available: {it.product.currentStock}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Vehicle / Truck Plate # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GJ-05-TX-9921"
                    value={dispatchForm.vehicleNumber}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Invoice Reference #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-0042"
                    value={dispatchForm.invoiceNumber}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Driver Name</label>
                  <input
                    type="text"
                    placeholder="Mohan Lal"
                    value={dispatchForm.driverName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driverName: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Driver Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98250 11223"
                    value={dispatchForm.driverPhone}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-[#292235] mb-1">Destination Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Plot 45, GIDC Industrial Estate, Surat"
                    value={dispatchForm.destination}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Dispatched Rolls</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="10"
                    value={dispatchForm.dispatchedRollCount}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchedRollCount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8DFEF] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFEF] rounded-lg font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || eligibleOrders.length === 0}
                  className="px-4 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Deducting Stock...' : 'Confirm Dispatch & Gate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
