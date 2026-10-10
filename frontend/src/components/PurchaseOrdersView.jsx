import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Building2
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
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')
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
    if (submitting) return;

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
        if (!newSupplier.name.trim()) {
          throw new Error('Supplier name is required');
        }
        payload.supplierName = newSupplier.name.trim();
        payload.contactPerson = newSupplier.contactPerson.trim();
        payload.supplierEmail = newSupplier.email.trim();
        payload.supplierPhone = newSupplier.phone.trim();
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
    if (submitting) return;

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
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      po.orderNumber.toLowerCase().includes(q) ||
      po.supplier?.name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = purchaseOrders.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Module Header - Clean and Prominent */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DFEF]">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#292235] tracking-tight">
            Purchase Management
          </h1>
          <p className="text-sm sm:text-base text-[#766D82] mt-1.5">
            Procure raw materials from spinning mills, receive goods at the gate, and update warehouse stock.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 border border-[#E8DFEF] bg-white rounded-xl hover:bg-[#FAF7FC] text-[#503568] transition cursor-pointer min-h-[44px]"
            title="Refresh Purchases"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl text-base font-semibold shadow-xs transition cursor-pointer min-h-[44px]"
          >
            <Plus className="w-5 h-5" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-start justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Notice:</p>
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

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Purchase Orders</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#292235] mt-1">{purchaseOrders.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Ordered Pending</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#503568] mt-1">
            {purchaseOrders.filter((p) => p.status === 'ORDERED').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Partially Received</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#7950A8] mt-1">
            {purchaseOrders.filter((p) => p.status === 'PARTIALLY_RECEIVED').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Procurement Spend</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">
            ₹{totalValue.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#766D82] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search PO # or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-[#E8DFEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7950A8] bg-white min-h-[42px]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer min-h-[38px] ${
                statusFilter === st
                  ? 'bg-[#7950A8] text-white shadow-xs'
                  : 'bg-white text-[#766D82] hover:bg-[#FAF7FC] border border-[#E8DFEF]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFEF] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF7FC] border-b border-[#E8DFEF] text-[#766D82] uppercase text-xs font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-10"></th>
                <th className="py-3.5 px-4">PO #</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Expected Delivery</th>
                <th className="py-3.5 px-4">Items / Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EEF8]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#766D82]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7950A8]" />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#766D82]">
                    No purchase orders found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  const isExpanded = expandedPoId === po.id;
                  const canReceive = po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED';
                  return (
                    <React.Fragment key={po.id}>
                      <tr className="hover:bg-[#FAF7FC] transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                            className="p-1 text-[#766D82] hover:text-[#503568] cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#503568]">{po.orderNumber}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#292235]">{po.supplier?.name}</div>
                          {po.supplier?.phone && <div className="text-xs text-[#766D82]">{po.supplier.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-[#766D82]">
                          {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#292235]">₹{po.totalAmount?.toLocaleString('en-IN')}</div>
                          <div className="text-xs text-[#766D82]">{po.items?.length || 0} items</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              po.status === 'RECEIVED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : po.status === 'PARTIALLY_RECEIVED'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-[#EEE5F7] text-[#503568] border-[#DFCFF0]'
                            }`}
                          >
                            {po.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {canReceive ? (
                            <button
                              onClick={() => handleOpenReceiveModal(po)}
                              className="px-3 py-1.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ml-auto"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Receive Goods</span>
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-700 font-semibold">Fully Received</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Line Items Details */}
                      {isExpanded && (
                        <tr className="bg-[#FAF7FC]">
                          <td colSpan={7} className="p-5 border-t border-[#F3EEF8]">
                            <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] space-y-3 text-sm">
                              <span className="font-bold text-[#503568] block">Ordered Items & Receipt Progress:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {po.items?.map((it, idx) => (
                                  <div key={idx} className="p-3 bg-[#FAF7FC] rounded-lg border border-[#E8DFEF]">
                                    <div className="font-semibold text-[#292235]">{it.product?.name} ({it.product?.code})</div>
                                    <div className="text-xs text-[#766D82] mt-1">
                                      Ordered: {it.orderedQty} {it.product?.unit} • Received: {it.receivedQty} {it.product?.unit}
                                    </div>
                                    <div className="font-bold text-[#503568] mt-1.5">
                                      Remaining: {Math.max(0, it.orderedQty - it.receivedQty)} {it.product?.unit}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {po.notes && (
                                <p className="text-xs text-[#766D82] pt-1">
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
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-lg text-[#292235]">Create Purchase Order</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="p-6 space-y-4">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-sm text-[#292235]">Yarn / Material Supplier *</label>
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={supplierMode === 'existing'}
                        onChange={() => setSupplierMode('existing')}
                        className="text-[#7950A8]"
                      />
                      <span>Select Existing</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
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
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  >
                    {suppliers.length === 0 ? (
                      <option value="">No suppliers found — switch to 'New Supplier'</option>
                    ) : (
                      suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.yarnTypesSupplied || 'Yarn Mill'})
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-3 bg-[#FAF7FC] p-3.5 rounded-xl border border-[#E8DFEF]">
                    <input
                      type="text"
                      required
                      placeholder="Supplier Name (e.g. Vardhman Textiles) *"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      className="px-3 py-2 border border-[#E8DFEF] rounded-xl bg-white text-sm min-h-[42px]"
                    />
                    <input
                      type="text"
                      placeholder="Contact Person Name"
                      value={newSupplier.contactPerson}
                      onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                      className="px-3 py-2 border border-[#E8DFEF] rounded-xl bg-white text-sm min-h-[42px]"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                      className="px-3 py-2 border border-[#E8DFEF] rounded-xl bg-white text-sm min-h-[42px]"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className="px-3 py-2 border border-[#E8DFEF] rounded-xl bg-white text-sm min-h-[42px]"
                    />
                  </div>
                )}
              </div>

              {/* Delivery Date & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">PO Notes / Terms</label>
                  <input
                    type="text"
                    placeholder="Lot test certificate required upon gate delivery"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3 pt-2 border-t border-[#E8DFEF]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#292235]">Purchased Raw Materials</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-[#7950A8] hover:text-[#674191] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Material
                  </button>
                </div>

                {poItems.map((item, index) => (
                  <div key={index} className="p-3.5 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] grid grid-cols-4 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-[#766D82] mb-1">
                        Select Material SKU
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg bg-white text-sm"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#766D82] mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={item.orderedQty}
                        onChange={(e) => handleItemChange(index, 'orderedQty', e.target.value)}
                        className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg bg-white text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-[#766D82] mb-1">Unit Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg bg-white text-sm"
                        />
                      </div>
                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-rose-500 hover:text-rose-700 cursor-pointer mb-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center text-sm font-bold pt-2">
                  <span>Estimated Total Amount:</span>
                  <span className="text-base text-[#503568]">₹{calculateTotal().toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8DFEF] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E8DFEF] rounded-xl font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {submitting ? 'Creating PO...' : 'Confirm Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Goods Inward Receipt */}
      {isReceiveModalOpen && selectedPoForReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#E8DFEF] text-[#292235] my-8">
            <div className="px-6 py-4 border-b border-[#E8DFEF] flex items-center justify-between bg-[#FAF7FC]">
              <div className="flex items-center gap-2.5">
                <PackageCheck className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-lg text-[#292235]">
                  Goods Receipt: {selectedPoForReceive.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-1.5 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className="p-6 space-y-4">
              <p className="text-sm text-[#766D82]">
                Enter actual physical delivery quantity received at gate. Warehouse stock will increase immediately.
              </p>

              <div className="space-y-3">
                {receiveData.map((item, index) => (
                  <div key={index} className="p-3.5 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-2">
                    <div className="flex justify-between items-center text-sm font-semibold text-[#292235]">
                      <span>{item.productName}</span>
                      <span className="text-xs text-[#766D82]">
                        Ordered: {item.orderedQty} {item.unit} | Received: {item.alreadyReceived} {item.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-[#503568]">Receive Now ({item.unit}):</label>
                      <input
                        type="number"
                        min="0"
                        max={item.orderedQty - item.alreadyReceived}
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleReceiveQuantityChange(index, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-[#E8DFEF] rounded-lg bg-white text-sm font-bold text-[#503568]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-sm text-[#292235] mb-1.5">Receipt Notes / Gate Log</label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                />
              </div>

              <div className="pt-4 border-t border-[#E8DFEF] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E8DFEF] rounded-xl font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {submitting ? 'Updating Stock...' : 'Confirm Inward Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
