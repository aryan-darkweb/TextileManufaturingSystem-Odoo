import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle,
  X,
  Calendar,
  Layers,
  Trash2,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCheck
} from 'lucide-react';
import { api } from '../services/api';

export function SalesOrdersView({ dbConnected, onOpenHealth }) {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Form State for Sales Order
  const [customerMode, setCustomerMode] = useState('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
  });
  const [deliveryDeadline, setDeliveryDeadline] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Items in Order
  const [items, setItems] = useState([
    {
      productId: '',
      fabricType: 'Raw Denim Twill',
      color: 'Indigo Blue',
      quantity: 500,
      unitPrice: 420,
    },
  ]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [ordersRes, custRes, prodRes] = await Promise.allSettled([
        api.getSalesOrders(),
        api.getCustomers(),
        api.getProducts(),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
        setOrders(ordersRes.value.data);
      }
      if (custRes.status === 'fulfilled' && custRes.value?.data) {
        setCustomers(custRes.value.data);
        if (custRes.value.data.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(custRes.value.data[0].id);
        }
      }
      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        setProducts(prodRes.value.data);
        if (prodRes.value.data.length > 0 && !items[0]?.productId) {
          setItems((prev) =>
            prev.map((it) => ({
              ...it,
              productId: it.productId || prodRes.value.data[0].id,
            }))
          );
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch sales order data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: products[0]?.id || '',
        fabricType: 'Pure Cotton Poplin',
        color: 'Optical White',
        quantity: 200,
        unitPrice: 320,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, it) => {
      const qty = parseFloat(it.quantity) || 0;
      const price = parseFloat(it.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        deliveryDeadline,
        notes,
        items: items.map((it) => ({
          productId: it.productId,
          fabricType: it.fabricType,
          color: it.color,
          quantity: parseFloat(it.quantity) || 0,
          unitPrice: parseFloat(it.unitPrice) || 0,
        })),
      };

      if (customerMode === 'existing') {
        if (!selectedCustomerId) {
          throw new Error('Please select an existing buyer customer');
        }
        payload.customerId = selectedCustomerId;
      } else {
        if (!newCustomer.name) {
          throw new Error('Buyer customer contact name is required');
        }
        payload.customerName = newCustomer.name;
        payload.companyName = newCustomer.companyName;
        payload.customerEmail = newCustomer.email;
        payload.customerPhone = newCustomer.phone;
      }

      const res = await api.createSalesOrder(payload);
      setSuccessMsg(`Sales Order ${res?.data?.orderNumber || ''} created successfully.`);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Error creating sales order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.updateSalesOrderStatus(orderId, newStatus);
      setSuccessMsg(`Order status successfully updated to ${newStatus.replace('_', ' ')}.`);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Error updating order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#292235]">Sales Orders</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EEE5F7] text-[#503568] border border-[#DFCFF0]">
              Buyer Orders & Fulfillment
            </span>
          </div>
          <p className="text-xs text-[#766D82] mt-1">
            Capture buyer contracts, ordered fabric types, delivery deadlines, and track fulfillment status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-[#E8DFEF] bg-white rounded-lg hover:bg-[#FAF7FC] text-[#503568] transition cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sales Order</span>
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
          <p className="text-2xl font-bold text-[#292235] mt-1">{orders.length}</p>
          <span className="text-[11px] text-[#766D82]">Registered buyer contracts</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">In Production</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {orders.filter((o) => ['PENDING', 'CONFIRMED', 'IN_PRODUCTION'].includes(o.status)).length}
          </p>
          <span className="text-[11px] text-[#766D82]">Floor processing active</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">Ready to Ship</span>
          <p className="text-2xl font-bold text-[#7950A8] mt-1">
            {orders.filter((o) => o.status === 'READY_TO_SHIP').length}
          </p>
          <span className="text-[11px] text-[#766D82]">Inspected rolls awaiting dispatch</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">Total Order Revenue</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalValue.toLocaleString()}</p>
          <span className="text-[11px] text-[#766D82]">Gross value of booked orders</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E8DFEF] shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#766D82] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search order number or buyer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#E8DFEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7950A8] focus:border-transparent bg-[#FAF7FC]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {['ALL', 'PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'DISPATCHED'].map((st) => (
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

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-[#E8DFEF] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7FC] border-b border-[#E8DFEF] text-[#766D82] uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Buyer Customer</th>
                <th className="py-3 px-4">Ordered Items</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Delivery Deadline</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EEF8]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#766D82]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#7950A8]" />
                    Loading sales orders from database...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#766D82]">
                    No sales orders found. Click <strong>"Create Sales Order"</strong> above to register a buyer order.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isExpanded = expandedOrderId === o.id;
                  return (
                    <React.Fragment key={o.id}>
                      <tr className="hover:bg-[#FAF7FC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#503568]">
                          <button
                            onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                            className="flex items-center gap-1 hover:text-[#7950A8] cursor-pointer"
                          >
                            <span>{o.orderNumber}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#292235]">{o.customer?.companyName || o.customer?.name}</div>
                          <div className="text-[11px] text-[#766D82]">{o.customer?.phone || o.customer?.email || 'Direct Buyer'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[#292235]">
                            {o.items?.length || 0} line {o.items?.length === 1 ? 'item' : 'items'}
                          </div>
                          <div className="text-[11px] text-[#766D82] truncate max-w-xs">
                            {o.items?.map((it) => `${it.fabricType} (${it.quantity})`).join(', ')}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-[#292235]">₹{(o.totalAmount || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-[#766D82]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#7950A8]" />
                            <span>{new Date(o.deliveryDeadline).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              o.status === 'READY_TO_SHIP'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : o.status === 'IN_PRODUCTION'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : o.status === 'DISPATCHED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : o.status === 'CONFIRMED'
                                ? 'bg-[#EEE5F7] text-[#503568] border-[#DFCFF0]'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {o.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={o.status}
                            disabled={updatingOrderId === o.id || o.status === 'DISPATCHED' || o.status === 'COMPLETED'}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            className="text-[11px] border border-[#E8DFEF] rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-[#7950A8] focus:outline-none disabled:opacity-50 cursor-pointer"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="IN_PRODUCTION">IN_PRODUCTION</option>
                            <option value="READY_TO_SHIP">READY_TO_SHIP</option>
                            <option value="DISPATCHED" disabled>DISPATCHED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                      </tr>

                      {/* Expandable Line Items Details */}
                      {isExpanded && (
                        <tr className="bg-[#FAF7FC]">
                          <td colSpan={7} className="p-4 border-t border-[#F3EEF8]">
                            <div className="bg-white p-3.5 rounded-xl border border-[#E8DFEF] space-y-2 text-xs">
                              <span className="font-bold text-[#503568] block">Line Item Specifications:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {o.items?.map((it, idx) => (
                                  <div key={idx} className="p-2.5 bg-[#FAF7FC] rounded-lg border border-[#E8DFEF]">
                                    <div className="font-semibold text-[#292235]">{it.fabricType}</div>
                                    <div className="text-[11px] text-[#766D82]">Color: {it.color}</div>
                                    <div className="text-[11px] text-[#766D82]">Quantity: {it.quantity} @ ₹{it.unitPrice}</div>
                                    <div className="font-bold text-[#503568] mt-1">Line Total: ₹{it.totalPrice}</div>
                                  </div>
                                ))}
                              </div>
                              {o.notes && (
                                <p className="text-[11px] text-[#766D82] pt-1">
                                  <strong>Notes:</strong> {o.notes}
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

      {/* Modal: Create Sales Order */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-[#E8DFEF] text-[#292235] my-8">
            <div className="px-6 py-4 border-b border-[#E8DFEF] flex items-center justify-between bg-[#FAF7FC]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-sm text-[#292235]">Create Buyer Sales Order</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 text-xs">
              {/* Buyer Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#292235]">Buyer Customer *</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={customerMode === 'existing'}
                        onChange={() => setCustomerMode('existing')}
                        className="text-[#7950A8]"
                      />
                      <span>Select Existing</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={customerMode === 'new'}
                        onChange={() => setCustomerMode('new')}
                        className="text-[#7950A8]"
                      />
                      <span>New Buyer</span>
                    </label>
                  </div>
                </div>

                {customerMode === 'existing' ? (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  >
                    {customers.length === 0 ? (
                      <option value="">No registered buyers found — switch to 'New Buyer'</option>
                    ) : (
                      customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName ? `${c.companyName} (${c.name})` : c.name}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 bg-[#FAF7FC] p-3 rounded-xl border border-[#E8DFEF]">
                    <input
                      type="text"
                      required
                      placeholder="Buyer Contact Name *"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="px-2.5 py-1.5 border border-[#E8DFEF] rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Company Name (e.g. Apex Apparels)"
                      value={newCustomer.companyName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })}
                      className="px-2.5 py-1.5 border border-[#E8DFEF] rounded-lg bg-white"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="px-2.5 py-1.5 border border-[#E8DFEF] rounded-lg bg-white"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="px-2.5 py-1.5 border border-[#E8DFEF] rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Deadline & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Delivery Deadline *</label>
                  <input
                    type="date"
                    required
                    value={deliveryDeadline}
                    onChange={(e) => setDeliveryDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Order Notes / Specifications</label>
                  <input
                    type="text"
                    placeholder="Export packing required, shade sample approved"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3 pt-2 border-t border-[#E8DFEF]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#292235]">Order Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-[#7950A8] hover:text-[#674191] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Fabric
                  </button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-[#766D82] mb-0.5">
                          Base SKU Product
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
                        <label className="block text-[10px] uppercase font-semibold text-[#766D82] mb-0.5">
                          Fabric Weave / Type
                        </label>
                        <input
                          type="text"
                          value={item.fabricType}
                          onChange={(e) => handleItemChange(index, 'fabricType', e.target.value)}
                          placeholder="e.g. 12oz Denim Twill"
                          className="w-full px-2 py-1.5 border border-[#E8DFEF] rounded bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 items-end">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-[#766D82] mb-0.5">Color</label>
                        <input
                          type="text"
                          value={item.color}
                          onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                          placeholder="Indigo Blue"
                          className="w-full px-2 py-1.5 border border-[#E8DFEF] rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-[#766D82] mb-0.5">Quantity</label>
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 border border-[#E8DFEF] rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-[#766D82] mb-0.5">Unit Price (₹)</label>
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 border border-[#E8DFEF] rounded bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-semibold text-[#292235]">
                          ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString()}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center px-2 py-1 text-sm font-bold text-[#292235]">
                  <span>Total Order Amount:</span>
                  <span className="text-[#503568] text-base">₹{calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8DFEF] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFEF] rounded-lg font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Placing Order...' : 'Submit Sales Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
