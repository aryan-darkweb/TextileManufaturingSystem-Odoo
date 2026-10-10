import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  Layers,
  Trash2,
  ChevronDown,
  ChevronUp
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

  // Today in YYYY-MM-DD local format
  const todayLocal = new Date().toLocaleDateString('en-CA');

  // Form State for Sales Order
  const [customerMode, setCustomerMode] = useState('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
  });
  const [phoneError, setPhoneError] = useState('');
  const [deliveryDeadline, setDeliveryDeadline] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')
  );
  const [deadlineError, setDeadlineError] = useState('');
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

  const handlePhoneChange = (e) => {
    // Only accept numeric digits, maximum 10 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    setNewCustomer({ ...newCustomer, phone: cleaned });
    if (cleaned.length > 0 && cleaned.length < 10) {
      setPhoneError(`Phone number must be exactly 10 digits (${cleaned.length}/10 entered)`);
    } else {
      setPhoneError('');
    }
  };

  const handleDeadlineChange = (e) => {
    const val = e.target.value;
    setDeliveryDeadline(val);
    if (val < todayLocal) {
      setDeadlineError('Delivery deadline cannot be in the past (yesterday and earlier dates are invalid)');
    } else {
      setDeadlineError('');
    }
  };

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
    if (submitting) return;

    // Delivery deadline validation
    if (deliveryDeadline < todayLocal) {
      setErrorMsg('Delivery deadline cannot be in the past. Please select a valid future date.');
      return;
    }

    // Buyer phone validation if creating new buyer
    if (customerMode === 'new') {
      if (!newCustomer.name.trim()) {
        setErrorMsg('Buyer contact name is required');
        return;
      }
      if (!/^\d{10}$/.test(newCustomer.phone)) {
        setErrorMsg('Buyer phone number must be exactly 10 numeric digits');
        return;
      }
    }

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
        payload.customerName = newCustomer.name.trim();
        payload.companyName = newCustomer.companyName.trim();
        payload.customerEmail = newCustomer.email.trim();
        payload.customerPhone = newCustomer.phone.trim();
      }

      const res = await api.createSalesOrder(payload);
      setSuccessMsg(`Sales Order ${res?.data?.orderNumber || ''} created successfully.`);
      setIsModalOpen(false);
      setNewCustomer({ name: '', companyName: '', email: '', phone: '' });
      setPhoneError('');
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
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q) ||
      o.customer?.companyName?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Module Header - Clean and Prominent */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DFEF]">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#292235] tracking-tight">
            Sales Orders
          </h1>
          <p className="text-sm sm:text-base text-[#766D82] mt-1.5">
            Manage buyer orders, ordered fabric items, and fulfillment statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 border border-[#E8DFEF] bg-white rounded-xl hover:bg-[#FAF7FC] text-[#503568] transition cursor-pointer min-h-[44px]"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl text-base font-semibold shadow-xs transition cursor-pointer min-h-[44px]"
          >
            <Plus className="w-5 h-5" />
            <span>Create Sales Order</span>
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

      {/* Summary KPI Strip - Clean and Focused */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Total Orders</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#292235] mt-1">{orders.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Confirmed</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#503568] mt-1">
            {orders.filter((o) => o.status === 'CONFIRMED').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">In Production</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#7950A8] mt-1">
            {orders.filter((o) => o.status === 'IN_PRODUCTION').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Pipeline Value</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">
            ₹{totalValue.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#766D82] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by order # or buyer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-[#E8DFEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7950A8] bg-white min-h-[42px]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'DISPATCHED'].map((st) => (
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

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFEF] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF7FC] border-b border-[#E8DFEF] text-[#766D82] uppercase text-xs font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-10"></th>
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Buyer Customer</th>
                <th className="py-3.5 px-4">Delivery Deadline</th>
                <th className="py-3.5 px-4">Items / Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EEF8]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#766D82]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7950A8]" />
                    Loading sales orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#766D82]">
                    No sales orders found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isExpanded = expandedOrderId === o.id;
                  return (
                    <React.Fragment key={o.id}>
                      <tr className="hover:bg-[#FAF7FC] transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                            className="p-1 text-[#766D82] hover:text-[#503568] cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#503568]">{o.orderNumber}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#292235]">
                            {o.customer?.companyName || o.customer?.name}
                          </div>
                          {o.customer?.phone && (
                            <div className="text-xs text-[#766D82]">{o.customer.phone}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#766D82]">
                          {new Date(o.deliveryDeadline).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#292235]">₹{o.totalAmount?.toLocaleString('en-IN')}</div>
                          <div className="text-xs text-[#766D82]">{o.items?.length || 0} line items</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              o.status === 'COMPLETED' || o.status === 'DISPATCHED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : o.status === 'IN_PRODUCTION'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-[#EEE5F7] text-[#503568] border-[#DFCFF0]'
                            }`}
                          >
                            {o.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <select
                            value={o.status}
                            disabled={updatingOrderId === o.id || o.status === 'DISPATCHED' || o.status === 'COMPLETED'}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            className="text-xs border border-[#E8DFEF] rounded-lg px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-[#7950A8] focus:outline-none disabled:opacity-50 cursor-pointer min-h-[36px]"
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
                          <td colSpan={7} className="p-5 border-t border-[#F3EEF8]">
                            <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] space-y-3 text-sm">
                              <span className="font-bold text-[#503568] block">Line Item Specifications:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {o.items?.map((it, idx) => (
                                  <div key={idx} className="p-3 bg-[#FAF7FC] rounded-lg border border-[#E8DFEF]">
                                    <div className="font-semibold text-[#292235]">{it.fabricType}</div>
                                    <div className="text-xs text-[#766D82]">Color: {it.color}</div>
                                    <div className="text-xs text-[#766D82]">Quantity: {it.quantity} @ ₹{it.unitPrice}</div>
                                    <div className="font-bold text-[#503568] mt-1">Line Total: ₹{it.totalPrice}</div>
                                  </div>
                                ))}
                              </div>
                              {o.notes && (
                                <p className="text-xs text-[#766D82] pt-1">
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
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-lg text-[#292235]">Create Buyer Sales Order</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              {/* Buyer Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-sm text-[#292235]">Buyer Customer *</label>
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={customerMode === 'existing'}
                        onChange={() => setCustomerMode('existing')}
                        className="text-[#7950A8]"
                      />
                      <span>Select Existing</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
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
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  >
                    {customers.length === 0 ? (
                      <option value="">No registered buyers found — switch to 'New Buyer'</option>
                    ) : (
                      customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName ? `${c.companyName} (${c.name})` : c.name} {c.phone ? `— ${c.phone}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="space-y-2.5 bg-[#FAF7FC] p-3.5 rounded-xl border border-[#E8DFEF]">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Buyer Contact Name *"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        className="px-3 py-2 border border-[#E8DFEF] rounded-xl bg-white text-sm min-h-[42px]"
                      />
                      <input
                        type="text"
                        placeholder="Company Name (e.g. Apex Apparels)"
                        value={newCustomer.companyName}
                        onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })}
                        className="px-3 py-2 border border-[#E8DFEF] rounded-xl bg-white text-sm min-h-[42px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        className="px-3 py-2 border border-[#E8DFEF] rounded-xl bg-white text-sm min-h-[42px]"
                      />
                      <div>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10-digit Phone # (e.g. 9825011223) *"
                          value={newCustomer.phone}
                          onChange={handlePhoneChange}
                          className={`w-full px-3 py-2 border rounded-xl bg-white text-sm min-h-[42px] ${
                            phoneError ? 'border-rose-400 focus:ring-rose-400' : 'border-[#E8DFEF]'
                          }`}
                        />
                        {phoneError && (
                          <p className="text-xs text-rose-600 mt-1 font-medium">{phoneError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Deadline & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">
                    Delivery Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    min={todayLocal}
                    value={deliveryDeadline}
                    onChange={handleDeadlineChange}
                    className={`w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px] ${
                      deadlineError ? 'border-rose-400 focus:ring-rose-400' : 'border-[#E8DFEF]'
                    }`}
                  />
                  {deadlineError && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{deadlineError}</p>
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">
                    Order Notes / Specifications
                  </label>
                  <input
                    type="text"
                    placeholder="Export packing required"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3 pt-2 border-t border-[#E8DFEF]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#292235]">Order Fabric Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-[#7950A8] hover:text-[#674191] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Fabric Item
                  </button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="p-3.5 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-2.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#766D82] mb-1">
                          Product SKU
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg bg-white text-sm"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.code}) — Stock: {p.currentStock} {p.unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#766D82] mb-1">
                          Fabric Type
                        </label>
                        <input
                          type="text"
                          value={item.fabricType}
                          onChange={(e) => handleItemChange(index, 'fabricType', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg bg-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-[#766D82] mb-1">
                          Color / Shade
                        </label>
                        <input
                          type="text"
                          value={item.color}
                          onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#766D82] mb-1">
                          Quantity (Meters)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg bg-white text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-[#766D82] mb-1">
                            Unit Price (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg bg-white text-sm"
                          />
                        </div>
                        {items.length > 1 && (
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E8DFEF] rounded-xl font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || Boolean(phoneError) || Boolean(deadlineError)}
                  className="px-6 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {submitting ? 'Creating Order...' : 'Confirm Sales Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
