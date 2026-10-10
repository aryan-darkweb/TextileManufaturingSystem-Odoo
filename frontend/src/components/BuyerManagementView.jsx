import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  ShoppingBag,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  Eye,
  Edit2,
  FileText,
  DollarSign,
  Phone,
  Mail,
  Building,
  MapPin,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { api } from '../services/api';

export function BuyerManagementView({ dbConnected, onOpenHealth }) {
  const [buyers, setBuyers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // View state: 'buyers' (directory) | 'orders' (all buyer orders)
  const [activeSubTab, setActiveSubTab] = useState('buyers');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Buyer Profile Drawer
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Buyer Create / Edit Modal
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [editingBuyerId, setEditingBuyerId] = useState(null);
  const [buyerForm, setBuyerForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    address: ''
  });
  const [phoneError, setPhoneError] = useState('');
  const [savingBuyer, setSavingBuyer] = useState(false);

  // Order Create Modal
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const todayLocal = new Date().toISOString().split('T')[0];
  const [deliveryDeadline, setDeliveryDeadline] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [deadlineError, setDeadlineError] = useState('');
  const [selectedBuyerIdForOrder, setSelectedBuyerIdForOrder] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState([
    {
      productId: '',
      fabricType: 'Pure Cotton Poplin',
      color: 'Optical White',
      quantity: 200,
      unitPrice: 320
    }
  ]);

  // Order Detail / Costing Modal
  const [costingOrder, setCostingOrder] = useState(null);
  const [loadingCosting, setLoadingCosting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [buyersRes, ordersRes, productsRes] = await Promise.allSettled([
        api.getBuyers(),
        api.getSalesOrders(),
        api.getProducts({ type: 'FINISHED_GOODS' })
      ]);

      if (buyersRes.status === 'fulfilled' && buyersRes.value?.data) {
        setBuyers(buyersRes.value.data);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
        setOrders(ordersRes.value.data);
      }
      if (productsRes.status === 'fulfilled' && productsRes.value?.data) {
        setProducts(productsRes.value.data);
        if (productsRes.value.data.length > 0 && !orderItems[0].productId) {
          setOrderItems((prev) => [
            {
              ...prev[0],
              productId: productsRes.value.data[0].id
            }
          ]);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load buyer data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch full buyer profile
  const handleOpenBuyerProfile = async (buyerId) => {
    setLoadingProfile(true);
    try {
      const res = await api.getBuyerById(buyerId);
      if (res?.data) {
        setSelectedBuyer(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch buyer profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Open Edit Buyer
  const handleOpenEditBuyer = (buyer) => {
    setEditingBuyerId(buyer.id);
    setBuyerForm({
      name: buyer.name || '',
      companyName: buyer.companyName || '',
      email: buyer.email || '',
      phone: buyer.phone || '',
      address: buyer.address || ''
    });
    setPhoneError('');
    setIsBuyerModalOpen(true);
  };

  // Open Create Buyer
  const handleOpenCreateBuyer = () => {
    setEditingBuyerId(null);
    setBuyerForm({
      name: '',
      companyName: '',
      email: '',
      phone: '',
      address: ''
    });
    setPhoneError('');
    setIsBuyerModalOpen(true);
  };

  // Phone Change with strict 10-digit validation
  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setBuyerForm((prev) => ({ ...prev, phone: raw }));
    if (raw.length === 0) {
      setPhoneError('Phone number is required');
    } else if (raw.length < 10) {
      setPhoneError(`Must be exactly 10 numeric digits (${raw.length}/10 entered)`);
    } else {
      setPhoneError('');
    }
  };

  // Save Buyer
  const handleSaveBuyer = async (e) => {
    e.preventDefault();
    if (!buyerForm.name.trim()) {
      setErrorMsg('Buyer contact name is required');
      return;
    }
    if (!/^\d{10}$/.test(buyerForm.phone)) {
      setPhoneError('Phone number must contain exactly 10 numeric digits (e.g. 9876543210)');
      return;
    }

    setSavingBuyer(true);
    setErrorMsg(null);
    try {
      if (editingBuyerId) {
        await api.updateBuyer(editingBuyerId, buyerForm);
        setSuccessMsg(`Buyer profile updated successfully.`);
      } else {
        await api.createBuyer(buyerForm);
        setSuccessMsg(`New buyer profile created successfully.`);
      }
      setIsBuyerModalOpen(false);
      await loadData();
      if (selectedBuyer && selectedBuyer.id === editingBuyerId) {
        handleOpenBuyerProfile(editingBuyerId);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save buyer');
    } finally {
      setSavingBuyer(false);
    }
  };

  // Deadline Change with strict future validation
  const handleDeadlineChange = (e) => {
    const val = e.target.value;
    setDeliveryDeadline(val);
    if (val < todayLocal) {
      setDeadlineError('Delivery deadline cannot be in the past (yesterday and earlier are strictly rejected)');
    } else {
      setDeadlineError('');
    }
  };

  const handleAddItem = () => {
    setOrderItems([
      ...orderItems,
      {
        productId: products[0]?.id || '',
        fabricType: 'Pure Cotton Poplin',
        color: 'Optical White',
        quantity: 200,
        unitPrice: 320
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...orderItems];
    updated[index][field] = value;
    setOrderItems(updated);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, it) => {
      const qty = parseFloat(it.quantity) || 0;
      const price = parseFloat(it.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  // Create Order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!selectedBuyerIdForOrder) {
      setErrorMsg('Please select a buyer');
      return;
    }
    if (deliveryDeadline < todayLocal) {
      setDeadlineError('Delivery deadline cannot be in the past');
      return;
    }

    setSubmittingOrder(true);
    setErrorMsg(null);
    try {
      const payload = {
        customerId: selectedBuyerIdForOrder,
        deliveryDeadline,
        notes: orderNotes,
        items: orderItems.map((it) => ({
          productId: it.productId,
          fabricType: it.fabricType,
          color: it.color,
          quantity: parseFloat(it.quantity) || 0,
          unitPrice: parseFloat(it.unitPrice) || 0
        }))
      };

      const res = await api.createSalesOrder(payload);
      setSuccessMsg(`Buyer Order ${res?.data?.orderNumber || ''} placed successfully.`);
      setIsOrderModalOpen(false);
      await loadData();
      if (selectedBuyer && selectedBuyer.id === selectedBuyerIdForOrder) {
        handleOpenBuyerProfile(selectedBuyerIdForOrder);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to place buyer order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Open Costing Inspector
  const handleOpenCosting = async (salesOrderId) => {
    setLoadingCosting(true);
    try {
      const res = await api.getOrderCosting(salesOrderId);
      if (res?.data) {
        setCostingOrder(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load order manufacturing costing');
    } finally {
      setLoadingCosting(false);
    }
  };

  // Filtered Buyers
  const filteredBuyers = buyers.filter((b) => {
    const q = searchTerm.toLowerCase();
    return (
      b.name?.toLowerCase().includes(q) ||
      b.companyName?.toLowerCase().includes(q) ||
      b.phone?.includes(q) ||
      b.email?.toLowerCase().includes(q)
    );
  });

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q) ||
      o.customer?.companyName?.toLowerCase().includes(q) ||
      o.workflowStage?.stageLabel?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DFEF]">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#292235] tracking-tight">
            Buyer Management
          </h1>
          <p className="text-sm sm:text-base text-[#766D82] mt-1.5">
            Buyer profiles, customer directory, commercial fabric orders, and live factory floor fulfillment stages.
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
            onClick={handleOpenCreateBuyer}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#7950A8] text-[#503568] hover:bg-[#FAF7FC] rounded-xl text-base font-semibold shadow-xs transition cursor-pointer min-h-[44px]"
          >
            <Users className="w-5 h-5 text-[#7950A8]" />
            <span>New Buyer</span>
          </button>
          <button
            onClick={() => {
              if (buyers.length > 0 && !selectedBuyerIdForOrder) {
                setSelectedBuyerIdForOrder(buyers[0].id);
              }
              setIsOrderModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl text-base font-semibold shadow-xs transition cursor-pointer min-h-[44px]"
          >
            <Plus className="w-5 h-5" />
            <span>Create Order</span>
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

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Total Buyers</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#292235] mt-1">{buyers.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Active Orders</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#503568] mt-1">{orders.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Orders Dispatched</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">
            {orders.filter((o) => o.status === 'DISPATCHED' || o.workflowStage?.stageKey === 'DISPATCHED').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Total Order Volume</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#292235] mt-1">
            ₹{orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Tab Navigation: Directory vs All Orders */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-[#EEE5F7] p-1.5 rounded-xl self-start">
          <button
            onClick={() => setActiveSubTab('buyers')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
              activeSubTab === 'buyers'
                ? 'bg-white text-[#503568] shadow-xs'
                : 'text-[#766D82] hover:text-[#292235]'
            }`}
          >
            Buyer Directory ({buyers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
              activeSubTab === 'orders'
                ? 'bg-white text-[#503568] shadow-xs'
                : 'text-[#766D82] hover:text-[#292235]'
            }`}
          >
            All Buyer Orders ({orders.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#766D82]" />
          <input
            type="text"
            placeholder={activeSubTab === 'buyers' ? 'Search buyers, phone, company...' : 'Search orders, buyers...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[#E8DFEF] bg-white text-base focus:outline-none focus:border-[#7950A8] min-h-[44px]"
          />
        </div>
      </div>

      {/* Subtab 1: Buyer Directory */}
      {activeSubTab === 'buyers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBuyers.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-[#E8DFEF] p-12 text-center text-[#766D82]">
              <Users className="w-12 h-12 mx-auto text-[#7950A8] mb-3 opacity-60" />
              <p className="text-lg font-bold text-[#292235]">No Buyers Found</p>
              <p className="text-sm mt-1">Add your first buyer contact using the "New Buyer" button above.</p>
            </div>
          ) : (
            filteredBuyers.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-[#E8DFEF] p-5 shadow-2xs hover:border-[#7950A8] transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-lg text-[#292235]">{b.name}</h3>
                      {b.companyName && (
                        <p className="text-sm text-[#766D82] flex items-center gap-1.5 mt-0.5">
                          <Building className="w-3.5 h-3.5" />
                          <span>{b.companyName}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenEditBuyer(b)}
                      className="p-1.5 text-[#766D82] hover:text-[#7950A8] rounded-lg hover:bg-[#FAF7FC] transition"
                      title="Edit Buyer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3.5 space-y-2 text-sm text-[#503568]">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#7950A8] shrink-0" />
                      <span className="font-semibold">{b.phone}</span>
                    </div>
                    {b.email && (
                      <div className="flex items-center gap-2 text-[#766D82]">
                        <Mail className="w-4 h-4 text-[#7950A8] shrink-0" />
                        <span className="truncate">{b.email}</span>
                      </div>
                    )}
                    {b.address && (
                      <div className="flex items-start gap-2 text-[#766D82]">
                        <MapPin className="w-4 h-4 text-[#7950A8] shrink-0 mt-0.5" />
                        <span className="text-xs line-clamp-1">{b.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E8DFEF] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#766D82]">Orders Placed</span>
                      <p className="font-bold text-sm text-[#292235] mt-0.5">{b.totalOrdersCount} orders</p>
                    </div>
                    <div>
                      <span className="text-[#766D82]">Total Volume</span>
                      <p className="font-bold text-sm text-[#503568] mt-0.5">₹{(b.totalOrderValue || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenBuyerProfile(b.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FAF7FC] hover:bg-[#EEE5F7] text-[#503568] rounded-xl text-sm font-bold border border-[#E8DFEF] transition cursor-pointer min-h-[44px]"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Buyer Profile & History</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Subtab 2: All Buyer Orders (Live Factory Progress) */}
      {activeSubTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-[#E8DFEF] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7FC] border-b border-[#E8DFEF] text-[#766D82] text-sm">
                  <th className="py-3.5 px-4 font-bold">Order Ref</th>
                  <th className="py-3.5 px-4 font-bold">Buyer</th>
                  <th className="py-3.5 px-4 font-bold">Deadline</th>
                  <th className="py-3.5 px-4 font-bold">Items</th>
                  <th className="py-3.5 px-4 font-bold">Live Factory Stage</th>
                  <th className="py-3.5 px-4 font-bold text-right">Order Value</th>
                  <th className="py-3.5 px-4 font-bold text-right">Costing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DFEF] text-sm text-[#292235]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-[#766D82]">
                      No sales orders found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const stage = o.workflowStage || { stageLabel: 'Order Received', progressPct: 10, badgeColor: 'purple' };
                    return (
                      <tr key={o.id} className="hover:bg-[#FAF7FC] transition">
                        <td className="py-4 px-4 font-bold text-[#503568]">{o.orderNumber}</td>
                        <td className="py-4 px-4">
                          <p className="font-bold">{o.customer?.name}</p>
                          <p className="text-xs text-[#766D82]">{o.customer?.companyName || o.customer?.phone}</p>
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold">
                          {new Date(o.deliveryDeadline).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          {o.items?.map((it, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-bold">{it.quantity} {it.product?.unit || 'M'}</span> — {it.fabricType} ({it.color})
                            </div>
                          ))}
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EEE5F7] text-[#503568]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#7950A8] animate-pulse"></span>
                              {stage.stageLabel}
                            </span>
                            <div className="w-full max-w-[140px] bg-[#E8DFEF] h-1.5 rounded-full overflow-hidden">
                              <div className="bg-[#7950A8] h-full" style={{ width: `${stage.progressPct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-right">
                          ₹{(o.totalAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleOpenCosting(o.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAF7FC] hover:bg-[#EEE5F7] text-[#503568] rounded-lg text-xs font-bold border border-[#E8DFEF] transition cursor-pointer"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Costing</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Buyer Profile Slide-over */}
      {selectedBuyer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl p-6 sm:p-8 overflow-y-auto space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-[#E8DFEF]">
              <div>
                <span className="text-xs uppercase font-bold text-[#7950A8] tracking-wider">Buyer Profile</span>
                <h2 className="text-2xl font-extrabold text-[#292235] mt-1">{selectedBuyer.name}</h2>
                <p className="text-sm text-[#766D82]">{selectedBuyer.companyName}</p>
              </div>
              <button
                onClick={() => setSelectedBuyer(null)}
                className="p-2 text-[#766D82] hover:text-[#292235] rounded-xl hover:bg-[#FAF7FC] cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contact details */}
            <div className="bg-[#FAF7FC] p-4 rounded-xl border border-[#E8DFEF] grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-[#766D82]">Phone</span>
                <p className="font-bold text-[#503568] mt-0.5">{selectedBuyer.phone}</p>
              </div>
              <div>
                <span className="text-xs text-[#766D82]">Email</span>
                <p className="font-semibold text-[#292235] mt-0.5">{selectedBuyer.email || '—'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-[#766D82]">Delivery Address</span>
                <p className="text-sm text-[#292235] mt-0.5">{selectedBuyer.address || '—'}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF]">
                <span className="text-xs text-[#766D82]">Total Orders</span>
                <p className="text-xl font-bold text-[#292235] mt-1">₹{(selectedBuyer.financialSummary?.totalOrderValue || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF]">
                <span className="text-xs text-[#766D82]">Invoiced</span>
                <p className="text-xl font-bold text-[#503568] mt-1">₹{(selectedBuyer.financialSummary?.totalInvoicedAmount || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF]">
                <span className="text-xs text-[#766D82]">Outstanding Due</span>
                <p className="text-xl font-bold text-amber-700 mt-1">₹{(selectedBuyer.financialSummary?.totalOutstandingBalance || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Orders History */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#292235]">Buyer Order History ({selectedBuyer.salesOrders?.length || 0})</h3>
              {selectedBuyer.salesOrders?.length === 0 ? (
                <p className="text-sm text-[#766D82] py-4">No orders placed by this buyer yet.</p>
              ) : (
                selectedBuyer.salesOrders?.map((ord) => (
                  <div key={ord.id} className="p-4 rounded-xl border border-[#E8DFEF] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#503568]">{ord.orderNumber}</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EEE5F7] text-[#503568]">
                        {ord.workflowStage?.stageLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-[#766D82]">
                      <div>
                        <span>Deadline:</span> <strong className="text-[#292235]">{new Date(ord.deliveryDeadline).toLocaleDateString()}</strong>
                      </div>
                      <div>
                        <span>Amount:</span> <strong className="text-[#292235]">₹{(ord.totalAmount || 0).toLocaleString('en-IN')}</strong>
                      </div>
                    </div>

                    <div className="border-t border-[#E8DFEF] pt-2 flex items-center justify-between text-xs">
                      <span className="text-[#766D82]">Invoiced: ₹{ord.totalInvoiced || 0} | Paid: ₹{ord.totalPaid || 0}</span>
                      <button
                        onClick={() => handleOpenCosting(ord.id)}
                        className="text-[#7950A8] hover:underline font-bold"
                      >
                        Manufacturing Costing &rarr;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Buyer Create / Edit Modal */}
      {isBuyerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E8DFEF] space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-[#E8DFEF]">
              <h2 className="text-xl font-bold text-[#292235]">
                {editingBuyerId ? 'Edit Buyer Profile' : 'Create New Buyer Profile'}
              </h2>
              <button onClick={() => setIsBuyerModalOpen(false)} className="text-[#766D82] hover:text-[#292235]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBuyer} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#292235] mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Singhania"
                  value={buyerForm.name}
                  onChange={(e) => setBuyerForm({ ...buyerForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFEF] text-base focus:outline-none focus:border-[#7950A8] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#292235] mb-1">Company / Mill Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex International Garments"
                  value={buyerForm.companyName}
                  onChange={(e) => setBuyerForm({ ...buyerForm, companyName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFEF] text-base focus:outline-none focus:border-[#7950A8] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#292235] mb-1">
                  Phone Number (Exactly 10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={buyerForm.phone}
                  onChange={handlePhoneChange}
                  className={`w-full px-4 py-2.5 rounded-xl border text-base focus:outline-none min-h-[44px] ${
                    phoneError ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30' : 'border-[#E8DFEF] focus:border-[#7950A8]'
                  }`}
                />
                {phoneError && <p className="text-xs text-rose-600 mt-1 font-medium">{phoneError}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#292235] mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="procurement@apexapparels.com"
                  value={buyerForm.email}
                  onChange={(e) => setBuyerForm({ ...buyerForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFEF] text-base focus:outline-none focus:border-[#7950A8] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#292235] mb-1">Delivery / Billing Address</label>
                <textarea
                  rows={2}
                  placeholder="Plot 45, GIDC Industrial Estate, Surat, Gujarat"
                  value={buyerForm.address}
                  onChange={(e) => setBuyerForm({ ...buyerForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFEF] text-base focus:outline-none focus:border-[#7950A8]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E8DFEF]">
                <button
                  type="button"
                  onClick={() => setIsBuyerModalOpen(false)}
                  className="px-4 py-2.5 border border-[#E8DFEF] rounded-xl text-sm font-bold text-[#766D82] hover:bg-[#FAF7FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBuyer || Boolean(phoneError)}
                  className="px-5 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {savingBuyer ? 'Saving...' : editingBuyerId ? 'Save Changes' : 'Create Buyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Creation Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E8DFEF] space-y-5 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-[#E8DFEF]">
              <h2 className="text-xl font-bold text-[#292235]">Create Buyer Sales Order</h2>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-[#766D82] hover:text-[#292235]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#292235] mb-1">Select Buyer *</label>
                <select
                  required
                  value={selectedBuyerIdForOrder}
                  onChange={(e) => setSelectedBuyerIdForOrder(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFEF] text-base focus:outline-none focus:border-[#7950A8] min-h-[44px]"
                >
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.companyName || b.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#292235] mb-1">
                  Delivery Deadline (Must Be In Future) *
                </label>
                <input
                  type="date"
                  required
                  min={todayLocal}
                  value={deliveryDeadline}
                  onChange={handleDeadlineChange}
                  className={`w-full px-4 py-2.5 rounded-xl border text-base focus:outline-none min-h-[44px] ${
                    deadlineError ? 'border-rose-400 bg-rose-50/30' : 'border-[#E8DFEF] focus:border-[#7950A8]'
                  }`}
                />
                {deadlineError && <p className="text-xs text-rose-600 mt-1">{deadlineError}</p>}
              </div>

              {/* Line Items */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#292235]">Fabric Specifications & Quantities</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-[#7950A8] hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                {orderItems.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#766D82] mb-1">Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#E8DFEF] text-sm bg-white"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#766D82] mb-1">Fabric Spec</label>
                        <input
                          type="text"
                          value={item.fabricType}
                          onChange={(e) => handleItemChange(idx, 'fabricType', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#E8DFEF] text-sm bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#766D82] mb-1">Colour</label>
                        <input
                          type="text"
                          value={item.color}
                          onChange={(e) => handleItemChange(idx, 'color', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#E8DFEF] text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#766D82] mb-1">Quantity (M)</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#E8DFEF] text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#766D82] mb-1">Price (₹/M)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#E8DFEF] text-sm bg-white"
                        />
                      </div>
                    </div>

                    {orderItems.length > 1 && (
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Remove Line
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <div className="text-right pt-2 text-base font-bold text-[#503568]">
                  Total Value: ₹{calculateTotal().toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#292235] mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special weave instructions or delivery tags"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFEF] text-base"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E8DFEF]">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2.5 border border-[#E8DFEF] rounded-xl text-sm font-bold text-[#766D82] hover:bg-[#FAF7FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder || Boolean(deadlineError)}
                  className="px-5 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {submittingOrder ? 'Placing Order...' : 'Place Buyer Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Costing Modal */}
      {costingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#E8DFEF] space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-[#E8DFEF]">
              <div>
                <span className="text-xs font-bold text-[#7950A8] uppercase">Order Costing Breakdown</span>
                <h3 className="text-xl font-bold text-[#292235]">{costingOrder.orderNumber}</h3>
              </div>
              <button onClick={() => setCostingOrder(null)} className="text-[#766D82] hover:text-[#292235]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF]">
                <span className="text-xs text-[#766D82]">Order Revenue</span>
                <p className="font-bold text-base text-[#292235] mt-0.5">₹{costingOrder.revenue.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF]">
                <span className="text-xs text-[#766D82]">Manufacturing Cost</span>
                <p className="font-bold text-base text-rose-700 mt-0.5">₹{costingOrder.totalManufacturingCost.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF]">
                <span className="text-xs text-[#766D82]">Gross Margin</span>
                <p className="font-bold text-base text-emerald-700 mt-0.5">
                  ₹{costingOrder.grossProfit.toLocaleString('en-IN')} ({costingOrder.marginPct}%)
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-[#766D82] uppercase">Cost Components:</span>
              <div className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] flex justify-between">
                <span>Raw Material Consumptions (Actual Yarn/Chemicals)</span>
                <strong>₹{costingOrder.materialCost.toLocaleString('en-IN')}</strong>
              </div>
              <div className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] flex justify-between">
                <span>Direct Production Labor (Operator Shift Wages)</span>
                <strong>₹{costingOrder.laborCost.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E8DFEF]">
              <button
                onClick={() => setCostingOrder(null)}
                className="px-4 py-2 bg-[#FAF7FC] hover:bg-[#EEE5F7] text-[#503568] font-bold rounded-xl text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
