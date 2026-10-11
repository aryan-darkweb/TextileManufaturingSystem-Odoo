import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export function DispatchView({ dbConnected, onOpenHealth }) {
  const [dispatchRecords, setDispatchRecords] = useState([]);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Auto-remove notification banners after 3.5 seconds
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State: Create Dispatch
  const [dispatchForm, setDispatchForm] = useState({
    salesOrderId: '',
    vehicleNumber: 'GJ-05-TX-9921',
    driverName: 'Mohan Lal',
    driverPhone: '9825144550',
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
        const orders = eligibleRes.value.data;
        setEligibleOrders(orders);
        if (orders.length > 0 && !dispatchForm.salesOrderId) {
          const first = orders[0];
          setDispatchForm((prev) => ({
            ...prev,
            salesOrderId: first.id,
            destination: first.customer?.address || 'Buyer Warehouse, Industrial Area',
            invoiceNumber: `INV-${new Date().getFullYear()}-${first.orderNumber.replace('SO-', '')}`,
            dispatchedRollCount: '1',
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
      dispatchedRollCount: '1',
    }));
  };

  const handleOpenDispatchForOrder = (order) => {
    setSelectedOrder(order);
    setDispatchForm({
      salesOrderId: order.id,
      vehicleNumber: 'MH-12-TX-4401',
      driverName: 'Ramesh Shinde',
      driverPhone: '+91 98221 44550',
      destination: order.customer?.address || 'Buyer Delivery Destination',
      invoiceNumber: `INV-${new Date().getFullYear()}-${order.orderNumber.replace('SO-', '')}`,
      dispatchedRollCount: '1',
    });
    setIsDispatchModalOpen(true);
  };

  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!dispatchForm.salesOrderId) {
        throw new Error('Please select an eligible sales order');
      }
      if (!dispatchForm.vehicleNumber.trim()) {
        throw new Error('Vehicle number is required');
      }
      if (!dispatchForm.destination.trim()) {
        throw new Error('Destination address is required');
      }

      const res = await api.createDispatch(dispatchForm);
      setSuccessMsg(
        `Dispatch ${res?.data?.dispatchNumber || ''} confirmed successfully. Warehouse stock deducted and order updated to DISPATCHED.`
      );
      setIsDispatchModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Error executing dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDispatches = dispatchRecords.filter((d) => {
    const q = searchTerm.toLowerCase();
    return (
      d.dispatchNumber.toLowerCase().includes(q) ||
      d.salesOrder?.orderNumber?.toLowerCase().includes(q) ||
      d.vehicleNumber.toLowerCase().includes(q) ||
      d.salesOrder?.customer?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Module Header - Clean and Prominent */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DFEF]">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#292235] tracking-tight">
            Dispatch & Logistics
          </h1>
          <p className="text-sm sm:text-base text-[#766D82] mt-1.5">
            Confirm vehicle gate-out, verify stock, and log shipment gate passes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 border border-[#E8DFEF] bg-white rounded-xl hover:bg-[#FAF7FC] text-[#503568] transition cursor-pointer min-h-[44px]"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          </button>
          <button
            onClick={() => setIsDispatchModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl text-base font-semibold shadow-xs transition cursor-pointer min-h-[44px]"
          >
            <Plus className="w-5 h-5" />
            <span>Create Dispatch</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-start justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Dispatch Error:</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Section 1: Orders Eligible for Dispatch */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#292235]">
            Orders Awaiting Dispatch ({eligibleOrders.length})
          </h2>
          <p className="text-sm text-[#766D82]">
            Select an order to verify stock availability and generate gate pass.
          </p>
        </div>

        {eligibleOrders.length === 0 ? (
          <div className="p-6 bg-white rounded-xl border border-[#E8DFEF] text-center text-sm text-[#766D82]">
            No sales orders currently awaiting dispatch. Confirmed orders will appear here automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eligibleOrders.map((ord) => {
              const hasInsufficientStock = ord.items?.some((i) => i.product.currentStock < i.quantity);
              return (
                <div
                  key={ord.id}
                  className="bg-white p-5 rounded-2xl border border-[#E8DFEF] hover:border-[#7950A8] transition-all flex flex-col justify-between space-y-4 shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-base text-[#503568]">{ord.orderNumber}</span>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EEE5F7] text-[#503568] border border-[#DFCFF0]">
                        {ord.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-[#292235]">
                        {ord.customer?.companyName || ord.customer?.name}
                      </h3>
                      <p className="text-sm text-[#766D82] mt-0.5">
                        Deadline: {new Date(ord.deliveryDeadline).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Order Line Items */}
                    <div className="pt-2 border-t border-[#F3EEF8] space-y-1.5">
                      {ord.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-[#292235] font-medium">
                            {it.fabricType} ({it.quantity} {it.product.unit})
                          </span>
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
                      <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Insufficient stock to dispatch</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenDispatchForOrder(ord)}
                    disabled={hasInsufficientStock}
                    className="w-full py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl text-[15px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Dispatch Order</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Dispatch History */}
      <div className="space-y-4 pt-4 border-t border-[#E8DFEF]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#292235]">Dispatch History</h2>
            <p className="text-sm text-[#766D82]">Recorded gate passes with confirmed stock deductions</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#766D82] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search dispatch or truck #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-[#E8DFEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7950A8] bg-white min-h-[42px]"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8DFEF] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF7FC] border-b border-[#E8DFEF] text-[#766D82] uppercase text-xs font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Dispatch #</th>
                  <th className="py-3.5 px-4">Sales Order</th>
                  <th className="py-3.5 px-4">Buyer Customer</th>
                  <th className="py-3.5 px-4">Vehicle / Driver</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Rolls</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EEF8]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#766D82]">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7950A8]" />
                      Loading dispatch history...
                    </td>
                  </tr>
                ) : filteredDispatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#766D82]">
                      No dispatch records found. Use the section above to dispatch eligible sales orders.
                    </td>
                  </tr>
                ) : (
                  filteredDispatches.map((d) => (
                    <tr key={d.id} className="hover:bg-[#FAF7FC] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#503568]">{d.dispatchNumber}</td>
                      <td className="py-3.5 px-4 font-mono text-[#292235]">{d.salesOrder?.orderNumber}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#292235]">
                        {d.salesOrder?.customer?.companyName || d.salesOrder?.customer?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#292235]">{d.vehicleNumber}</div>
                        <div className="text-xs text-[#766D82]">{d.driverName || 'Driver'} {d.driverPhone ? `(${d.driverPhone})` : ''}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#766D82] max-w-xs truncate" title={d.destination}>
                        {d.destination}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#292235]">{d.dispatchedRollCount} rolls</td>
                      <td className="py-3.5 px-4 text-[#766D82]">
                        {d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleDateString() : new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
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
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-lg text-[#292235]">Confirm Truck Gate-Out Dispatch</h3>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-1.5 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="p-6 space-y-4">
              {/* Sales Order Selection */}
              <div>
                <label className="block font-semibold text-sm text-[#292235] mb-1.5">
                  Select Sales Order to Dispatch *
                </label>
                <select
                  value={dispatchForm.salesOrderId}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
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
                <div className="p-3.5 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-1.5">
                  <span className="font-bold text-sm text-[#503568]">Order Items & Warehouse Stock:</span>
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-[#766D82]">
                      <span>{it.fabricType} ({it.quantity} {it.product.unit})</span>
                      <span className="font-semibold text-emerald-800">Available: {it.product.currentStock} {it.product.unit}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">
                    Vehicle / Truck Plate # *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GJ-05-TX-9921"
                    value={dispatchForm.vehicleNumber}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">
                    Invoice Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-0042"
                    value={dispatchForm.invoiceNumber}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, invoiceNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">Driver Name</label>
                  <input
                    type="text"
                    placeholder="Mohan Lal"
                    value={dispatchForm.driverName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driverName: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">Driver Phone</label>
                  <input
                    type="tel"
                    placeholder="9825011223"
                    value={dispatchForm.driverPhone}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driverPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">Destination Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Plot 45, GIDC Industrial Estate, Surat"
                    value={dispatchForm.destination}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">Roll Count</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="10"
                    value={dispatchForm.dispatchedRollCount}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchedRollCount: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8DFEF] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E8DFEF] rounded-xl font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || eligibleOrders.length === 0}
                  className="px-6 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {submitting ? 'Confirming Dispatch...' : 'Confirm Dispatch & Gate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
