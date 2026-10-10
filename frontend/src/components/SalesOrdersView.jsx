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
  User,
  Clock,
  Layers,
  Trash2
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

  // Form State for Sales Order
  const [customerMode, setCustomerMode] = useState('existing'); // 'existing' or 'new'
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
          throw new Error('Buyer customer name is required');
        }
        payload.customerName = newCustomer.name;
        payload.companyName = newCustomer.companyName;
        payload.customerEmail = newCustomer.email;
        payload.customerPhone = newCustomer.phone;
      }

      const res = await api.createSalesOrder(payload);
      setSuccessMsg(`Sales Order ${res?.data?.orderNumber || 'created'} saved successfully.`);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Error creating sales order');
    } finally {
      setSubmitting(false);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Sales Orders & Buyer Tracking</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Kishan's Module
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track buyer orders: fabric types, colors, quantity, deadlines, and live production status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-sm transition"
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
              {!dbConnected && (
                <button onClick={onOpenHealth} className="mt-2 text-rose-900 underline font-semibold cursor-pointer">
                  Configure Supabase Connection →
                </button>
              )}
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-medium">Total Orders</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{orders.length}</p>
          <span className="text-[11px] text-slate-400">Received from buyers</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-medium">Pending / In Production</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {orders.filter((o) => ['PENDING', 'CONFIRMED', 'IN_PRODUCTION'].includes(o.status)).length}
          </p>
          <span className="text-[11px] text-slate-400">Active floor fulfillment</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-medium">Ready to Ship</span>
          <p className="text-2xl font-bold text-sky-600 mt-1">
            {orders.filter((o) => o.status === 'READY_TO_SHIP').length}
          </p>
          <span className="text-[11px] text-slate-400">Inspected rolls awaiting truck</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-medium">Total Order Value</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalValue.toLocaleString()}</p>
          <span className="text-[11px] text-slate-400">Total revenue pipeline</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by order number or buyer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'DISPATCHED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Buyer Customer</th>
                <th className="py-3 px-4">Ordered Items</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Delivery Deadline</th>
                <th className="py-3 px-4">Fulfillment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading sales orders from database...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No sales orders found. Click <strong>"Create Sales Order"</strong> above to register a buyer order.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{o.customer?.companyName || o.customer?.name}</div>
                      <div className="text-[11px] text-slate-400">{o.customer?.phone || o.customer?.email || 'Direct Buyer'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {o.items?.map((it, i) => (
                          <div key={i} className="text-slate-700">
                            <span className="font-medium">{it.fabricType}</span> ({it.color}) —{' '}
                            <strong>{it.quantity}</strong> units @ ₹{it.unitPrice}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">₹{(o.totalAmount || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(o.deliveryDeadline).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          o.status === 'READY_TO_SHIP'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : o.status === 'IN_PRODUCTION'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : o.status === 'DISPATCHED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Create Buyer Sales Order</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-5 text-xs">
              {/* Buyer Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Buyer Customer</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={customerMode === 'existing'}
                        onChange={() => setCustomerMode('existing')}
                        className="text-emerald-600"
                      />
                      <span>Select Existing</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={customerMode === 'new'}
                        onChange={() => setCustomerMode('new')}
                        className="text-emerald-600"
                      />
                      <span>New Buyer</span>
                    </label>
                  </div>
                </div>

                {customerMode === 'existing' ? (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
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
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      required
                      placeholder="Buyer Contact Name *"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Company Name (e.g. Apex Apparels)"
                      value={newCustomer.companyName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Deadline & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delivery Deadline *</label>
                  <input
                    type="date"
                    required
                    value={deliveryDeadline}
                    onChange={(e) => setDeliveryDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Order Notes / Specifications</label>
                  <input
                    type="text"
                    placeholder="Export packing required, shade sample approved"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Order Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Fabric
                  </button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-0.5">
                          Base SKU Product
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-0.5">
                          Fabric Type
                        </label>
                        <input
                          type="text"
                          value={item.fabricType}
                          onChange={(e) => handleItemChange(index, 'fabricType', e.target.value)}
                          placeholder="e.g. 12oz Denim Twill"
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 items-end">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-0.5">Color</label>
                        <input
                          type="text"
                          value={item.color}
                          onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                          placeholder="Indigo Blue"
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-0.5">Quantity</label>
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-0.5">Unit Price (₹)</label>
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-semibold text-slate-800">
                          ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString()}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center px-2 py-1 text-sm font-bold text-slate-900">
                  <span>Grand Total Order Value:</span>
                  <span className="text-emerald-700 text-base">₹{calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
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
