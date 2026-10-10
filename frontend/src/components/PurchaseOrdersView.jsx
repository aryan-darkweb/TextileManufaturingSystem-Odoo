import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle,
  X,
  Calendar,
  Building2,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Layers
} from 'lucide-react';
import { api } from '../services/api';

export function PurchaseOrdersView({ dbConnected, onOpenHealth }) {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPoForReceive, setSelectedPoForReceive] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedPoId, setExpandedPoId] = useState(null);

  // Form State: Create PO
  const [supplierMode, setSupplierMode] = useState('existing');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    yarnTypesSupplied: 'Combed Cotton, Spun Polyester',
  });
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState([
    {
      productId: '',
      orderedQty: 500,
      unitPrice: 280,
    },
  ]);

  // Form State: Receive Goods
  const [receiveData, setReceiveData] = useState([]);
  const [receiveNotes, setReceiveNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [posRes, suppRes, prodRes] = await Promise.allSettled([
        api.getPurchaseOrders(),
        api.getSuppliers(),
        api.getProducts(),
      ]);

      if (posRes.status === 'fulfilled' && posRes.value?.data) {
        setPurchaseOrders(posRes.value.data);
      }
      if (suppRes.status === 'fulfilled' && suppRes.value?.data) {
        setSuppliers(suppRes.value.data);
        if (suppRes.value.data.length > 0 && !selectedSupplierId) {
          setSelectedSupplierId(suppRes.value.data[0].id);
        }
      }
      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        setProducts(prodRes.value.data);
        if (prodRes.value.data.length > 0 && !poItems[0]?.productId) {
          setPoItems((prev) =>
            prev.map((it) => ({
              ...it,
              productId: it.productId || prodRes.value.data[0].id,
            }))
          );
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch purchase order records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = () => {
    setPoItems([
      ...poItems,
      {
        productId: products[0]?.id || '',
        orderedQty: 250,
        unitPrice: 200,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (poItems.length > 1) {
      setPoItems(poItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...poItems];
    updated[index][field] = value;
    setPoItems(updated);
  };

  const calculateTotal = () => {
    return poItems.reduce((sum, it) => {
      const qty = parseFloat(it.orderedQty) || 0;
      const price = parseFloat(it.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        expectedDeliveryDate,
        notes,
        items: poItems.map((it) => ({
          productId: it.productId,
          orderedQty: parseFloat(it.orderedQty) || 0,
          unitPrice: parseFloat(it.unitPrice) || 0,
        })),
      };

      if (supplierMode === 'existing') {
        if (!selectedSupplierId) {
          throw new Error('Please select a supplier');
        }
        payload.supplierId = selectedSupplierId;
      } else {
        if (!newSupplier.name) {
          throw new Error('Supplier name is required');
        }
        payload.supplierName = newSupplier.name;
        payload.contactPerson = newSupplier.contactPerson;
        payload.supplierEmail = newSupplier.email;
        payload.supplierPhone = newSupplier.phone;
        payload.yarnTypesSupplied = newSupplier.yarnTypesSupplied;
      }

      const res = await api.createPurchaseOrder(payload);
      setSuccessMsg(`Purchase Order ${res?.data?.orderNumber || ''} created successfully.`);
      setIsCreateModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Error creating purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReceiveModal = (po) => {
    setSelectedPoForReceive(po);
    // Initialize receipt quantities with remaining outstanding quantities
    const initialReceipts = po.items.map((it) => ({
      itemId: it.id,
      productId: it.productId,
      productName: it.product?.name || 'Raw Material',
      orderedQty: it.orderedQty,
      alreadyReceived: it.receivedQty,
      quantity: Math.max(0, it.orderedQty - it.receivedQty),
      unit: it.product?.unit || 'KG',
    }));
    setReceiveData(initialReceipts);
    setReceiveNotes(`Gate inward receipt for PO ${po.orderNumber}`);
    setIsReceiveModalOpen(true);
  };

  const handleReceiveQuantityChange = (index, value) => {
    const updated = [...receiveData];
    updated[index].quantity = Math.max(0, parseFloat(value) || 0);
    setReceiveData(updated);
  };

  const handleConfirmReceive = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const validItems = receiveData.filter((i) => i.quantity > 0);
      if (validItems.length === 0) {
        throw new Error('Please specify a positive quantity to receive for at least one item');
      }

      await api.receivePurchaseOrderGoods(selectedPoForReceive.id, {
        receivedItems: validItems.map((i) => ({
          itemId: i.itemId,
          productId: i.productId,
          quantity: i.quantity,
        })),
        notes: receiveNotes,
      });

      setSuccessMsg(`Goods received against ${selectedPoForReceive.orderNumber}. Inventory stock updated.`);
      setIsReceiveModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Error recording goods receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#292235]">Purchase Management</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EEE5F7] text-[#503568] border border-[#DFCFF0]">
              Raw Materials & Supplier Procurement
            </span>
          </div>
          <p className="text-xs text-[#766D82] mt-1">
            Order yarn from spinning mills, record incoming deliveries at the gate, and update warehouse stock.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-[#E8DFEF] bg-white rounded-lg hover:bg-[#FAF7FC] text-[#503568] transition cursor-pointer"
            title="Refresh Purchases"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
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

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">Total Orders</span>
          <p className="text-2xl font-bold text-[#292235] mt-1">{purchaseOrders.length}</p>
          <span className="text-[11px] text-[#766D82]">Procurement purchase orders</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">Awaiting Delivery</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {purchaseOrders.filter((po) => ['ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)).length}
          </p>
          <span className="text-[11px] text-[#766D82]">Yarn trucks in transit</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">Fully Received</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {purchaseOrders.filter((po) => po.status === 'RECEIVED').length}
          </p>
          <span className="text-[11px] text-[#766D82]">Inwarded & stock updated</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">Suppliers</span>
          <p className="text-2xl font-bold text-[#503568] mt-1">{suppliers.length}</p>
          <span className="text-[11px] text-[#766D82]">Active raw material vendors</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E8DFEF] shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#766D82] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search PO number or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#E8DFEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7950A8] focus:border-transparent bg-[#FAF7FC]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {['ALL', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#503568] text-white shadow-2xs'
                  : 'bg-[#FAF7FC] text-[#766D82] hover:bg-[#EEE5F7]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-xl border border-[#E8DFEF] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7FC] border-b border-[#E8DFEF] text-[#766D82] uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">PO #</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Ordered Materials</th>
                <th className="py-3 px-4">Progress (Recv / Ord)</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EEF8]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#766D82]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#7950A8]" />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#766D82]">
                    No purchase orders found. Click <strong>"Create Purchase Order"</strong> above to procure raw yarn.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  const isExpanded = expandedPoId === po.id;
                  const totalOrdered = po.items?.reduce((s, i) => s + i.orderedQty, 0) || 0;
                  const totalReceived = po.items?.reduce((s, i) => s + i.receivedQty, 0) || 0;
                  const canReceive = po.status !== 'RECEIVED' && po.status !== 'CANCELLED';

                  return (
                    <React.Fragment key={po.id}>
                      <tr className="hover:bg-[#FAF7FC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#503568]">
                          <button
                            onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                            className="flex items-center gap-1 hover:text-[#7950A8] cursor-pointer"
                          >
                            <span>{po.orderNumber}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#292235]">{po.supplier?.name}</div>
                          <div className="text-[11px] text-[#766D82]">
                            {po.supplier?.contactPerson ? `Contact: ${po.supplier.contactPerson}` : 'Direct Mill Supplier'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[#292235]">
                            {po.items?.length || 0} line {po.items?.length === 1 ? 'item' : 'items'}
                          </div>
                          <div className="text-[11px] text-[#766D82] truncate max-w-xs">
                            {po.items?.map((it) => it.product?.name).join(', ')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#292235]">
                            {totalReceived} / {totalOrdered}
                          </div>
                          <div className="w-24 bg-[#E8DFEF] h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-[#7950A8] h-full transition-all"
                              style={{ width: `${totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-[#292235]">₹{(po.totalAmount || 0).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              po.status === 'RECEIVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : po.status === 'PARTIALLY_RECEIVED'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            {po.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canReceive ? (
                            <button
                              onClick={() => handleOpenReceiveModal(po)}
                              className="px-2.5 py-1 bg-[#EEE5F7] text-[#503568] hover:bg-[#7950A8] hover:text-white rounded-md text-[11px] font-semibold transition cursor-pointer"
                            >
                              Receive Goods
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-semibold">Completed</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable PO Line Items */}
                      {isExpanded && (
                        <tr className="bg-[#FAF7FC]">
                          <td colSpan={7} className="p-4 border-t border-[#F3EEF8]">
                            <div className="bg-white p-3.5 rounded-xl border border-[#E8DFEF] space-y-2 text-xs">
                              <span className="font-bold text-[#503568] block">Ordered Items Breakdown:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {po.items?.map((it, idx) => (
                                  <div key={idx} className="p-2.5 bg-[#FAF7FC] rounded-lg border border-[#E8DFEF]">
                                    <div className="font-semibold text-[#292235]">{it.product?.name} ({it.product?.code})</div>
                                    <div className="text-[11px] text-[#766D82]">
                                      Ordered: <strong>{it.orderedQty}</strong> {it.product?.unit} @ ₹{it.unitPrice}
                                    </div>
                                    <div className="text-[11px] text-[#503568] font-medium">
                                      Received So Far: {it.receivedQty} {it.product?.unit}
                                    </div>
                                    <div className="font-bold text-[#292235] mt-1">Total: ₹{it.totalPrice}</div>
                                  </div>
                                ))}
                              </div>
                              {po.notes && (
                                <p className="text-[11px] text-[#766D82] pt-1">
                                  <strong>Notes:</strong> {po.notes}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Purchase Order */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-[#E8DFEF] text-[#292235] my-8">
            <div className="px-6 py-4 border-b border-[#E8DFEF] flex items-center justify-between bg-[#FAF7FC]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-sm text-[#292235]">Create Raw Material Purchase Order</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="p-6 space-y-4 text-xs">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#292235]">Yarn / Material Supplier *</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={supplierMode === 'existing'}
                        onChange={() => setSupplierMode('existing')}
                        className="text-[#7950A8]"
                      />
                      <span>Select Existing</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={supplierMode === 'new'}
                        onChange={() => setSupplierMode('new')}
                        className="text-[#7950A8]"
                      />
                      <span>New Supplier</span>
                    </label>
                  </div>
                </div>

                {supplierMode === 'existing' ? (
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  >
                    {suppliers.length === 0 ? (
                      <option value="">No suppliers found — switch to 'New Supplier'</option>
                    ) : (
                      suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.contactPerson ? `(${s.contactPerson})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 bg-[#FAF7FC] p-3 rounded-xl border border-[#E8DFEF]">
                    <input
                      type="text"
                      required
                      placeholder="Supplier Business Name *"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      className="px-2.5 py-1.5 border border-[#E8DFEF] rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Contact Person"
                      value={newSupplier.contactPerson}
                      onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                      className="px-2.5 py-1.5 border border-[#E8DFEF] rounded-lg bg-white"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                      className="px-2.5 py-1.5 border border-[#E8DFEF] rounded-lg bg-white"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className="px-2.5 py-1.5 border border-[#E8DFEF] rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Delivery Date & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Expected Arrival Date</label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">PO Notes / Quality Terms</label>
                  <input
                    type="text"
                    placeholder="Lot test certificate required upon gate delivery"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3 pt-2 border-t border-[#E8DFEF]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#292235]">Purchased Raw Materials</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-[#7950A8] hover:text-[#674191] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Material
                  </button>
                </div>

                {poItems.map((item, index) => (
                  <div key={index} className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] grid grid-cols-4 gap-2.5 items-end">
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-[#766D82] mb-0.5">
                        Raw Material / Yarn SKU
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        className="w-full px-2 py-1.5 border border-[#E8DFEF] rounded bg-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-[#766D82] mb-0.5">Quantity</label>
                      <input
                        type="number"
                        step="any"
                        value={item.orderedQty}
                        onChange={(e) => handleItemChange(index, 'orderedQty', e.target.value)}
                        className="w-full px-2 py-1.5 border border-[#E8DFEF] rounded bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase font-semibold text-[#766D82] mb-0.5">Unit Rate (₹)</label>
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 border border-[#E8DFEF] rounded bg-white"
                        />
                      </div>
                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-rose-500 hover:text-rose-700 p-1 mb-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center px-2 py-1 text-sm font-bold text-[#292235]">
                  <span>Total Procurement Amount:</span>
                  <span className="text-[#503568] text-base">₹{calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8DFEF] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFEF] rounded-lg font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Placing Order...' : 'Submit Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Receive Goods (Atomic Stock Intake) */}
      {isReceiveModalOpen && selectedPoForReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#E8DFEF] text-[#292235]">
            <div className="px-6 py-4 border-b border-[#E8DFEF] flex items-center justify-between bg-[#FAF7FC]">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-sm text-[#292235]">
                  Receive Inward Goods: {selectedPoForReceive.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-1 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] text-xs space-y-1">
                <span className="text-[#766D82]">Supplier:</span>
                <span className="font-bold text-[#292235] block">{selectedPoForReceive.supplier?.name}</span>
                <span className="text-[11px] text-[#766D82]">
                  Receiving goods will automatically increment available inventory stock and log an inward audit receipt.
                </span>
              </div>

              <div className="space-y-2.5">
                <span className="font-bold text-[#292235] block">Enter Quantities Received at Gate:</span>
                {receiveData.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-[#E8DFEF] flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-[#292235]">{item.productName}</div>
                      <div className="text-[11px] text-[#766D82]">
                        Ordered: {item.orderedQty} {item.unit} | Received earlier: {item.alreadyReceived} {item.unit}
                      </div>
                    </div>
                    <div className="w-28">
                      <label className="text-[10px] text-[#766D82] block mb-0.5">Quantity to Inward</label>
                      <input
                        type="number"
                        step="any"
                        max={item.orderedQty - item.alreadyReceived}
                        min="0"
                        value={item.quantity}
                        onChange={(e) => handleReceiveQuantityChange(idx, e.target.value)}
                        className="w-full px-2 py-1.5 border border-[#E8DFEF] rounded font-bold text-[#503568] bg-[#FAF7FC]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-[#292235] mb-1">Gate Inward / Delivery Notes</label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="Gate entry truck pass verified, lot approved"
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg bg-[#FAF7FC] focus:ring-2 focus:ring-[#7950A8] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E8DFEF] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFEF] rounded-lg font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Updating Stock...' : 'Confirm Inward Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
