import React, { useState, useEffect } from 'react';
import {
  Factory,
  Package,
  Users,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Sparkles,
  Cpu,
  Activity,
  Play,
  RotateCw,
  Settings
} from 'lucide-react';
import { api } from '../services/api';

export function MillFlowView({ dbConnected, onOpenHealth }) {
  const [pipelineData, setPipelineData] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState('1'); // '1' | '2' | '3' | '4' | '5'
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  // Modals state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isYarnModalOpen, setIsYarnModalOpen] = useState(false);
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  // Selected items for modals
  const [selectedOrderForYarn, setSelectedOrderForYarn] = useState(null);
  const [selectedProdForQc, setSelectedProdForQc] = useState(null);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState(null);

  // Form states
  const [orderForm, setOrderForm] = useState({
    buyerId: '',
    newBuyerName: '',
    newBuyerPhone: '',
    fabricId: '',
    quantity: '25',
    unitPrice: '540',
    yarnRatio: '1.25',
    yarnId: '',
    notes: ''
  });

  const handleFabricSelect = (fabricId) => {
    const selectedFabric = fabrics.find((f) => f.id === fabricId);
    let ratio = '1.25';
    let targetYarnId = yarns[0]?.id || '';
    if (selectedFabric?.specifications) {
      try {
        const spec = JSON.parse(selectedFabric.specifications);
        if (spec.yarnRatio) ratio = String(spec.yarnRatio);
        if (spec.yarnCode) {
          const y = yarns.find((item) => item.code === spec.yarnCode);
          if (y) targetYarnId = y.id;
        }
      } catch {
        // ignore
      }
    }
    setOrderForm((prev) => ({
      ...prev,
      fabricId,
      yarnId: targetYarnId,
      yarnRatio: ratio,
      unitPrice: selectedFabric ? String(selectedFabric.unitCost || prev.unitPrice) : prev.unitPrice
    }));
  };

  const [yarnForm, setYarnForm] = useState({
    supplierId: '',
    isNewSupplier: false,
    newSupplierName: '',
    newSupplierPhone: '',
    yarnId: '',
    quantity: '100',
    unitPrice: '260',
    autoReceive: true
  });

  const [qcForm, setQcForm] = useState({
    outcome: 'GOOD', // 'GOOD' | 'DEFECTIVE'
    defectNotes: '',
    defectType: 'UNEVEN_WEAVING',
    rerunIfDefective: true
  });

  const [dispatchTab, setDispatchTab] = useState('ready'); // 'ready' | 'history'
  const [dispatchForm, setDispatchForm] = useState({
    vehicleNumber: 'MH-12-TX-4401',
    driverName: 'Ramesh Shinde',
    driverPhone: '+91 98221 44550',
    destination: 'Buyer Central Warehouse'
  });

  const [machineFilterTab, setMachineFilterTab] = useState('ALL'); // 'ALL' | 'SPINNING' | 'WEAVING' | 'DYEING'
  const [targetMachineSelections, setTargetMachineSelections] = useState({});

  const notify = (type, message) => {
    setNotification({ type, message });
  };

  // Auto-remove notification banner after 3.5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pipeRes, finRes] = await Promise.all([
        api.getMillPipeline(),
        api.getOwnerMillFinancials()
      ]);
      if (pipeRes?.data) setPipelineData(pipeRes.data);
      if (finRes?.data) setFinancials(finRes.data);
    } catch (err) {
      notify('error', err.message || 'Failed to load mill pipeline data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Update Machine Status (RUNNING, IDLE, MAINTENANCE, BREAKDOWN)
  const handleUpdateMachineStatus = async (machineId, newStatus) => {
    setActionLoading(true);
    try {
      await api.updateMillMachineStatus(machineId, newStatus);
      notify('success', `Machine status updated to ${newStatus}`);
      await loadAll();
    } catch (err) {
      notify('error', err.message || 'Error updating machine status');
    } finally {
      setActionLoading(false);
    }
  };

  // Advance production order through Spinning -> Weaving -> Dyeing -> Completed
  const handleAdvanceStage = async (order, targetStage) => {
    setActionLoading(true);
    try {
      const prodId = order.productionRun?.id || order.id;
      const chosenMachineId = targetMachineSelections[prodId] || undefined;
      const res = await api.advanceMillProductionStage(prodId, {
        targetStage,
        machineId: chosenMachineId
      });
      notify('success', res.message || `Production advanced to ${targetStage}!`);
      await loadAll();
    } catch (err) {
      notify('error', err.message || 'Error advancing production stage');
    } finally {
      setActionLoading(false);
    }
  };

  // Fast-track all 3 steps directly to QC
  const handleFastTrackProduction = async (order) => {
    setActionLoading(true);
    try {
      const prodId = order.productionRun?.id || order.id;
      await api.advanceMillProductionStage(prodId, { targetStage: 'COMPLETED' });
      notify('success', 'All 3 steps (Spinning, Weaving, Dyeing) completed! Opening Quality Inspection...');
      await loadAll();
      setSelectedProdForQc(order.productionRun || { id: order.id });
      setQcForm({
        outcome: 'GOOD',
        defectNotes: '',
        defectType: 'UNEVEN_WEAVING',
        rerunIfDefective: true
      });
      setIsQcModalOpen(true);
    } catch (err) {
      notify('error', err.message || 'Error completing production');
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Submit New Buyer Order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        buyerId: orderForm.buyerId || undefined,
        newBuyer: !orderForm.buyerId && orderForm.newBuyerName ? {
          name: orderForm.newBuyerName,
          phone: orderForm.newBuyerPhone
        } : undefined,
        fabricId: orderForm.fabricId,
        quantity: parseFloat(orderForm.quantity),
        unitPrice: parseFloat(orderForm.unitPrice),
        yarnRatio: parseFloat(orderForm.yarnRatio) || 5.0,
        yarnId: orderForm.yarnId || undefined,
        notes: orderForm.notes
      };

      const res = await api.createMillBuyerOrder(payload);
      notify('success', `Buyer order created! Required yarn: ${res.data.yarnRequirement.neededQuantity} ${res.data.yarnRequirement.hasEnoughYarn ? '(In Stock)' : '(Shortage detected)'}`);
      setIsOrderModalOpen(false);
      loadAll();
    } catch (err) {
      notify('error', err.message || 'Error creating buyer order');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Submit Yarn Purchase from Supplier
  const handleOrderYarn = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        supplierId: yarnForm.isNewSupplier ? undefined : yarnForm.supplierId,
        newSupplier: yarnForm.isNewSupplier ? {
          name: yarnForm.newSupplierName,
          phone: yarnForm.newSupplierPhone
        } : undefined,
        yarnId: yarnForm.yarnId,
        quantity: parseFloat(yarnForm.quantity),
        unitPrice: parseFloat(yarnForm.unitPrice),
        autoReceive: yarnForm.autoReceive
      };

      const res = await api.orderYarnMill ? await api.orderYarnMill(payload) : await api.orderMillYarn(payload);
      notify('success', `Yarn ordered & received into stock! Current stock: ${res.data.yarn.newStock} ${res.data.yarn.unit}`);
      setIsYarnModalOpen(false);
      loadAll();
    } catch (err) {
      notify('error', err.message || 'Error ordering yarn');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Start Production & Deduct Yarn Immediately
  const handleStartProduction = async (order) => {
    setActionLoading(true);
    try {
      const payload = {
        salesOrderId: order.id,
        targetQuantity: order.fabric.quantity,
        yarnId: order.yarnRequirement.yarnId,
        yarnQuantity: order.yarnRequirement.neededQuantity
      };

      const res = await api.startMillProduction(payload);
      notify('success', `Production started! Deducted ${res.data.deductedYarn.quantityDeducted} ${res.data.deductedYarn.unit} yarn from inventory immediately.`);
      loadAll();
      setActiveStepTab('2'); // Advance to Production tab
    } catch (err) {
      notify('error', err.message || 'Error starting production');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Submit Quality Inspection (Good vs Defective)
  const handleQualityInspect = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        productionOrderId: selectedProdForQc?.id,
        salesOrderId: selectedProdForQc?.salesOrderId || selectedProdForQc?.id,
        outcome: qcForm.outcome,
        defectNotes: qcForm.defectNotes,
        defectType: qcForm.defectType,
        rerunIfDefective: qcForm.rerunIfDefective
      };

      await api.inspectMillQuality(payload);
      if (qcForm.outcome === 'GOOD') {
        notify('success', 'Quality Passed! Finished fabric added to warehouse stock & ready for Dispatch.');
        setActiveStepTab('4');
      } else {
        notify('error', 'Fabric marked Defective! Yarn was consumed and wasted (₹0 revenue). Rerun scheduled.');
        setActiveStepTab('1');
      }
      setIsQcModalOpen(false);
      loadAll();
    } catch (err) {
      notify('error', err.message || 'Error recording quality check');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Submit Dispatch & Deliver to Buyer
  const handleDispatch = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        salesOrderId: selectedOrderForDispatch?.id,
        vehicleNumber: dispatchForm.vehicleNumber || 'MH-12-TX-4401',
        driverName: dispatchForm.driverName || 'Ramesh Shinde',
        driverPhone: dispatchForm.driverPhone || '+91 98221 44550',
        destination: dispatchForm.destination || selectedOrderForDispatch?.customer?.address || 'Buyer Warehouse'
      };

      const res = await api.dispatchMillFabric(payload);
      notify('success', `🎉 Fabric successfully dispatched & confirmed delivered to ${res.data.buyer}! Moved to Dispatch History.`);
      setIsDispatchModalOpen(false);
      await loadAll();
      setActiveStepTab('4'); // Stay on Step 4
      setDispatchTab('history'); // Switch to Dispatch History sub-tab so user sees it right away!
    } catch (err) {
      notify('error', err.message || 'Error dispatching fabric');
    } finally {
      setActionLoading(false);
    }
  };

  const yarns = pipelineData?.yarns || [];
  const fabrics = pipelineData?.fabrics || [];
  const suppliers = pipelineData?.suppliers || [];
  const buyers = pipelineData?.buyers || [];
  const orders = pipelineData?.orders || [];
  const stageMachines = pipelineData?.stageMachines || {
    all: [],
    spinning: [],
    weaving: [],
    dyeing: []
  };

  const machinesList =
    machineFilterTab === 'SPINNING'
      ? stageMachines.spinning
      : machineFilterTab === 'WEAVING'
      ? stageMachines.weaving
      : machineFilterTab === 'DYEING'
      ? stageMachines.dyeing
      : stageMachines.all;

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q) ||
      o.fabric?.name?.toLowerCase().includes(q)
    );
  });

  const step1Orders = filteredOrders.filter(
    (o) => (o.step === 1 || o.isDefective) && !o.isDelivered && o.status !== 'DELIVERED' && o.status !== 'COMPLETED'
  );
  const step2Orders = filteredOrders.filter(
    (o) => o.step === 2 && !o.isDelivered && o.status !== 'DELIVERED' && o.status !== 'COMPLETED'
  );
  const step3Orders = filteredOrders.filter(
    (o) => (o.step === 3 || (o.step === 2 && o.productionRun)) && !o.isDelivered && o.status !== 'DELIVERED' && o.status !== 'COMPLETED'
  );
  const step4Orders = filteredOrders.filter(
    (o) => o.step === 4 && !o.isDelivered && o.status !== 'DELIVERED' && o.status !== 'COMPLETED' && !o.dispatch
  );
  const deliveredOrders = filteredOrders.filter(
    (o) => o.isDelivered || o.status === 'DELIVERED' || o.status === 'COMPLETED' || Boolean(o.dispatch)
  );

  const totalYarnStock = yarns.reduce((acc, y) => acc + (y.currentStock || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-lg transition-all animate-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#503568] via-[#674191] to-[#7950A8] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#7950A8]/15 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Everest Textile Mills — Direct Manufacturing Pipeline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Simplified Manufacturing
            </h1>
            <p className="text-sm text-purple-100 max-w-2xl leading-relaxed">
              Order fabric &rarr; verify dynamic yarn recipe &rarr; 3-step parallel machine execution (Spinning, Weaving, Dyeing) &rarr; QC inspection & fabric approval &rarr; dispatch & deliver &rarr; owner monthly financials.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const defaultFabric = fabrics[0];
                let defaultRatio = '1.25';
                let defaultYarnId = yarns[0]?.id || '';
                let defaultPrice = '540';
                if (defaultFabric) {
                  defaultPrice = String(defaultFabric.unitCost || 540);
                  if (defaultFabric.specifications) {
                    try {
                      const spec = JSON.parse(defaultFabric.specifications);
                      if (spec.yarnRatio) defaultRatio = String(spec.yarnRatio);
                      if (spec.yarnCode) {
                        const y = yarns.find((item) => item.code === spec.yarnCode);
                        if (y) defaultYarnId = y.id;
                      }
                    } catch {}
                  }
                }
                setOrderForm({
                  buyerId: buyers[0]?.id || '',
                  newBuyerName: '',
                  newBuyerPhone: '',
                  fabricId: defaultFabric?.id || '',
                  quantity: '25',
                  unitPrice: defaultPrice,
                  yarnRatio: defaultRatio,
                  yarnId: defaultYarnId,
                  notes: ''
                });
                setIsOrderModalOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-white text-[#503568] font-bold text-sm shadow-md hover:bg-purple-50 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-[#7950A8]" />
              New Buyer Order
            </button>

            <button
              onClick={loadAll}
              disabled={loading}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md"
              title="Refresh Pipeline"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DFEF] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#766D82]">Yarn In Stock</span>
            <div className="w-8 h-8 rounded-xl bg-[#EEE5F7] text-[#7950A8] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalYarnStock.toLocaleString()} <span className="text-xs font-normal text-slate-500">KG</span>
          </div>
          <div className="text-[11px] text-[#7950A8] font-medium mt-1">
            Across {yarns.length} yarn varieties
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DFEF] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#766D82]">Active In Production</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {step2Orders.length} <span className="text-xs font-normal text-slate-500">Jobs</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            Yarn deducted & on looms
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DFEF] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#766D82]">Defect Waste</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">
            {financials?.summary?.totalWastedYarnQuantity || 0} <span className="text-xs font-normal text-slate-500">KG</span>
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">
            Yarn lost ($0 revenue earned)
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DFEF] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#766D82]">Net Mill Profit/Loss</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${(financials?.summary?.netProfitOrLoss || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            ₹{Math.abs(financials?.summary?.netProfitOrLoss || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {(financials?.summary?.netProfitOrLoss || 0) >= 0 ? 'Profitable (Fabric Sales > Yarn)' : 'Net Deficit'}
          </div>
        </div>
      </div>

      {/* 5-Step Visual Pipeline Navigation */}
      <div className="bg-white rounded-3xl border border-[#E8DFEF] p-2 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {[
            { id: '1', title: '1. Order & Yarn Check', subtitle: `${step1Orders.length} pending`, icon: ShoppingBag },
            { id: '2', title: '2. 3-Step Manufacturing', subtitle: 'Spinning, Weaving, Dyeing', icon: Factory },
            { id: '3', title: '3. Quality Check', subtitle: 'Good vs Defect', icon: CheckCircle2 },
            { id: '4', title: '4. Dispatch & Deliver', subtitle: `${step4Orders.length} ready • ${deliveredOrders.length} delivered`, icon: Truck },
            { id: '5', title: '5. Owner P&L & Ledger', subtitle: 'Monthly Statement', icon: TrendingUp }
          ].map((step) => {
            const Icon = step.icon;
            const isActive = activeStepTab === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStepTab(step.id)}
                className={`flex flex-col items-start p-3 sm:p-4 rounded-2xl transition-all text-left ${
                  isActive
                    ? 'bg-[#EEE5F7] border border-[#7950A8]/30 text-[#503568] shadow-xs'
                    : 'hover:bg-[#FAF7FC] text-[#766D82]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#7950A8]' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${isActive ? 'text-[#503568]' : 'text-slate-700'}`}>
                    {step.title}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-500">{step.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Buyer Order & Yarn Check */}
      {activeStepTab === '1' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 1: Buyer Orders & Yarn BOM Check</h2>
              <p className="text-xs text-slate-500">
                Dynamic yarn consumption recipe calculated per fabric. If yarn is in stock, start production immediately. If short, order from trusted or new supplier.
              </p>
            </div>
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#7950A8] hover:bg-[#674191] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Buyer Order
            </button>
          </div>

          {step1Orders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No pending orders waiting for production</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Buyer Order" above to place a new fabric order.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E8DFEF] overflow-hidden shadow-xs divide-y divide-slate-100">
              {step1Orders.map((order) => {
                const req = order.yarnRequirement;
                return (
                  <div key={order.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1.5 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-900 px-2 py-0.5 rounded-lg bg-purple-100">
                          {order.orderNumber}
                        </span>
                        <span className="font-bold text-sm text-slate-900">{order.customer?.name}</span>
                        {order.isDefective && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                            DEFECT RERUN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        Ordered: <strong>{order.fabric.quantity} {order.fabric.unit}</strong> of <em>{order.fabric.name}</em> (@ ₹{order.fabric.unitPrice}/{order.fabric.unit} = ₹{order.fabric.totalValue.toLocaleString()})
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>BOM: 1 {order.fabric.unit} = {req.ratio} {req.unit} yarn</span>
                        <span>&bull;</span>
                        <span>Total Yarn Needed: <strong className="text-slate-900 font-mono">{req.neededQuantity} {req.unit}</strong></span>
                      </div>
                    </div>

                    {/* Stock Status Pill */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="text-right">
                        {req.hasEnoughYarn ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>In Stock ({req.availableQuantity} {req.unit} ready)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Shortage ({req.shortageQuantity} {req.unit} deficit)</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {req.hasEnoughYarn ? (
                          <button
                            onClick={() => handleStartProduction(order)}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <Factory className="w-3.5 h-3.5" />
                            Start Production (Deduct Yarn)
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedOrderForYarn(order);
                              setYarnForm({
                                supplierId: suppliers[0]?.id || '',
                                isNewSupplier: false,
                                newSupplierName: '',
                                newSupplierPhone: '',
                                yarnId: req.yarnId || yarns[0]?.id || '',
                                quantity: String(req.shortageQuantity || 100),
                                unitPrice: '160',
                                autoReceive: true
                              });
                              setIsYarnModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-[#7950A8] hover:bg-[#674191] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Order Yarn from Supplier
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: 3-Step Manufacturing (Spinning, Weaving, Dyeing) with Parallel Machines */}
      {activeStepTab === '2' && (
        <div className="space-y-6">
          {/* Header & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-[#503568] text-[11px] font-bold tracking-wide mb-1">
                <Cpu className="w-3 h-3 text-[#7950A8]" />
                <span>3 Sequential Stages &bull; 12 Parallel Machines (4 per Step)</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Step 2: 3-Step Manufacturing (Spinning &rarr; Weaving &rarr; Dyeing)
              </h2>
              <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                Raw material yarn is immediately reduced from inventory. The batch advances sequentially through 3 dedicated manufacturing operations: <strong>Spinning</strong> (raw fiber to spun cones) &rarr; <strong>Weaving</strong> (yarn cones to grey woven fabric) &rarr; <strong>Dyeing</strong> (grey fabric to finished color rolls). Each step features 4 dedicated machines running in parallel.
              </p>
            </div>
            <button
              onClick={loadAll}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-xs shrink-0 self-start"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
              Refresh Machine Metrics
            </button>
          </div>

          {/* Yarn Reduction Notice Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="leading-relaxed">
              <strong>Yarn Inventory Notice:</strong> Raw yarn was already deducted from warehouse stock upon starting. Regardless of whether the fabric passes QC or turns out defective in Step 3, the yarn remains consumed.
            </div>
          </div>

          {/* 3 Step Process Highlights (Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Step A: Spinning */}
            <div className="bg-white p-4 rounded-2xl border border-[#E8DFEF] shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-black">
                    1
                  </span>
                  <span className="text-xs font-black uppercase text-indigo-900 tracking-wider">
                    Spinning Step
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  4 Parallel Frames
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Converts raw combed cotton & filaments into precision spun cones.
              </p>
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Input Taken</span>
                  <div className="font-mono font-bold text-slate-800">
                    {stageMachines.spinning.reduce((acc, m) => acc + (m.inputTaken || 0), 0).toLocaleString()} KG
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Spun Produced</span>
                  <div className="font-mono font-bold text-indigo-700">
                    {stageMachines.spinning.reduce((acc, m) => acc + (m.quantityProduced || 0), 0).toLocaleString()} KG
                  </div>
                </div>
              </div>
            </div>

            {/* Step B: Weaving */}
            <div className="bg-white p-4 rounded-2xl border border-[#E8DFEF] shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-xs font-black">
                    2
                  </span>
                  <span className="text-xs font-black uppercase text-purple-900 tracking-wider">
                    Weaving Step
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  4 Parallel Looms
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Interlaces warp & weft yarn cones into high-density grey woven fabric.
              </p>
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Input Taken</span>
                  <div className="font-mono font-bold text-slate-800">
                    {stageMachines.weaving.reduce((acc, m) => acc + (m.inputTaken || 0), 0).toLocaleString()} M
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Grey Produced</span>
                  <div className="font-mono font-bold text-purple-700">
                    {stageMachines.weaving.reduce((acc, m) => acc + (m.quantityProduced || 0), 0).toLocaleString()} M
                  </div>
                </div>
              </div>
            </div>

            {/* Step C: Dyeing */}
            <div className="bg-white p-4 rounded-2xl border border-[#E8DFEF] shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-black">
                    3
                  </span>
                  <span className="text-xs font-black uppercase text-teal-900 tracking-wider">
                    Dyeing Step
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  4 Parallel Jets
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                High-temperature jet dyeing & color finishing into final fabric rolls.
              </p>
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Input Taken</span>
                  <div className="font-mono font-bold text-slate-800">
                    {stageMachines.dyeing.reduce((acc, m) => acc + (m.inputTaken || 0), 0).toLocaleString()} M
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Dyed Produced</span>
                  <div className="font-mono font-bold text-teal-700">
                    {stageMachines.dyeing.reduce((acc, m) => acc + (m.quantityProduced || 0), 0).toLocaleString()} M
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Live Tracking for Each Machine */}
          <div className="bg-white rounded-3xl border border-[#E8DFEF] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#7950A8]" />
                  Machine Live Operational Tracking (Input Taken, Products Produced & Status)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track each parallel machine independently: monitor input raw materials, quantity produced, shift capacity, and status.
                </p>
              </div>

              {/* Machine Filter Tabs */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
                {[
                  { id: 'ALL', label: `All 12 Machines (${stageMachines.all.length})` },
                  { id: 'SPINNING', label: `Spinning (${stageMachines.spinning.length})` },
                  { id: 'WEAVING', label: `Weaving (${stageMachines.weaving.length})` },
                  { id: 'DYEING', label: `Dyeing (${stageMachines.dyeing.length})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMachineFilterTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      machineFilterTab === tab.id
                        ? 'bg-white text-[#503568] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Machines Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {machinesList.map((m) => {
                const isRunning = m.status === 'RUNNING';
                const isIdle = m.status === 'IDLE';
                const isMaintenance = m.status === 'MAINTENANCE';
                const isBreakdown = m.status === 'BREAKDOWN';

                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      isRunning
                        ? 'bg-white border-slate-200 hover:border-[#7950A8]/40 shadow-xs'
                        : isIdle
                        ? 'bg-slate-50/70 border-slate-200'
                        : 'bg-rose-50/30 border-rose-200'
                    }`}
                  >
                    {/* Machine Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                            {m.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              m.type === 'SPINNING'
                                ? 'bg-indigo-50 text-indigo-700'
                                : m.type === 'WEAVING'
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-teal-50 text-teal-700'
                            }`}
                          >
                            {m.type}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs mt-1 line-clamp-1" title={m.name}>
                          {m.name}
                        </h4>
                      </div>

                      {/* Live Status Pill & Switcher */}
                      <div className="flex flex-col items-end">
                        <select
                          value={m.status}
                          disabled={actionLoading}
                          onChange={(e) => handleUpdateMachineStatus(m.id, e.target.value)}
                          className={`text-[11px] font-black rounded-lg px-2 py-1 border transition-all cursor-pointer ${
                            isRunning
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isIdle
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : isMaintenance
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <option value="RUNNING">● RUNNING</option>
                          <option value="IDLE">○ IDLE</option>
                          <option value="MAINTENANCE">▲ MAINT</option>
                          <option value="BREAKDOWN">✖ DOWN</option>
                        </select>
                      </div>
                    </div>

                    {/* Machine Metrics: Input Taken vs Products Produced */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Input Taken
                        </span>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {m.inputTaken.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal text-slate-500">{m.unit}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Produced
                        </span>
                        <div className="font-mono font-bold text-emerald-700 text-sm">
                          {m.quantityProduced.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal text-slate-500">{m.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Machine Footer: Capacity & Current Job */}
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>Cap: {m.capacityPerShift} {m.unit}/shift</span>
                      <span className="font-medium text-slate-400">{m.currentShift}</span>
                    </div>

                    {/* Active Running Job Pill */}
                    {m.activeJob ? (
                      <div className="p-2 rounded-xl bg-purple-50 text-[11px] text-purple-900 border border-purple-100">
                        <div className="font-bold flex items-center justify-between">
                          <span>Job: {m.activeJob.orderNumber}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-purple-200/60 rounded text-purple-800">Active</span>
                        </div>
                        <div className="text-[10px] text-purple-700 truncate mt-0.5">
                          {m.activeJob.productName} &bull; {m.activeJob.inputQuantity} {m.unit}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-slate-50/60 text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px]">Ready for parallel batch</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Active Production Runs Pipeline & Stage Advancement */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Active Production Orders ({step2Orders.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Advance yarn through each step in parallel across spinning frames, weaving looms, and dyeing jets.
                </p>
              </div>
            </div>

            {step2Orders.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                <Factory className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">No active production runs right now</p>
                <p className="text-xs text-slate-400 mt-1">Start production from Step 1 when yarn is verified in stock.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {step2Orders.map((order) => {
                  const run = order.productionRun;
                  const currentStage = run?.stage || 'SPINNING';
                  const prodId = run?.id || order.id;

                  const isSpinning = currentStage === 'SPINNING';
                  const isWeaving = currentStage === 'WEAVING';
                  const isDyeing = currentStage === 'DYEING';

                  // Available next machines
                  const nextMachines = isSpinning
                    ? stageMachines.weaving
                    : isWeaving
                    ? stageMachines.dyeing
                    : [];

                  return (
                    <div
                      key={order.id}
                      className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8DFEF] shadow-xs space-y-5"
                    >
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-purple-900 px-2 py-0.5 rounded-lg bg-purple-100">
                              {run?.orderNumber || order.orderNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              Ref: {order.orderNumber}
                            </span>
                          </div>
                          <h4 className="font-black text-slate-900 text-base mt-1">
                            {order.fabric.name} &bull; {order.fabric.quantity} {order.fabric.unit}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Buyer: <strong>{order.customer?.name}</strong> &bull; Deducted Yarn:{' '}
                            <strong className="text-rose-700">
                              -{order.yarnRequirement.neededQuantity} {order.yarnRequirement.unit}
                            </strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-black tracking-wide ${
                              isSpinning
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : isWeaving
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : 'bg-teal-100 text-teal-900 border border-teal-200'
                            }`}
                          >
                            CURRENT STEP: {currentStage}
                          </span>
                        </div>
                      </div>

                      {/* 3-Step Visual Progress Stepper */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Step 1: Spinning */}
                        <div
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isSpinning
                              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200'
                              : isWeaving || isDyeing
                              ? 'bg-emerald-50/50 border-emerald-200'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold flex items-center gap-1.5 text-slate-800">
                              <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">
                                1
                              </span>
                              Spinning Frame
                            </span>
                            {isWeaving || isDyeing ? (
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                              </span>
                            ) : isSpinning ? (
                              <span className="text-[10px] font-bold text-indigo-700 animate-pulse">
                                Active Running
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Pending</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Machine: <strong>{run?.machine?.code || 'SPN-01'}</strong>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Input: {order.yarnRequirement.neededQuantity} KG Yarn
                          </div>
                        </div>

                        {/* Step 2: Weaving */}
                        <div
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isWeaving
                              ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-200'
                              : isDyeing
                              ? 'bg-emerald-50/50 border-emerald-200'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold flex items-center gap-1.5 text-slate-800">
                              <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black">
                                2
                              </span>
                              Weaving Loom
                            </span>
                            {isDyeing ? (
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                              </span>
                            ) : isWeaving ? (
                              <span className="text-[10px] font-bold text-purple-700 animate-pulse">
                                Active Loom
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Pending</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Machine: <strong>{isWeaving ? run?.machine?.code || 'WEV-01' : 'WEV-01..04'}</strong>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Target: {order.fabric.quantity} M Grey Fabric
                          </div>
                        </div>

                        {/* Step 3: Dyeing */}
                        <div
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isDyeing
                              ? 'bg-teal-50/70 border-teal-300 ring-2 ring-teal-200'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold flex items-center gap-1.5 text-slate-800">
                              <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-black">
                                3
                              </span>
                              Dyeing Jet
                            </span>
                            {isDyeing ? (
                              <span className="text-[10px] font-bold text-teal-700 animate-pulse">
                                Active Dyeing
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Pending</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Machine: <strong>{isDyeing ? run?.machine?.code || 'DYE-01' : 'DYE-01..04'}</strong>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Target: {order.fabric.quantity} M Finished Roll
                          </div>
                        </div>
                      </div>

                      {/* Stage Advancement Action Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        {isSpinning && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-slate-600">Next Weaving Loom:</span>
                              <select
                                value={targetMachineSelections[prodId] || nextMachines[0]?.id || ''}
                                onChange={(e) =>
                                  setTargetMachineSelections((prev) => ({
                                    ...prev,
                                    [prodId]: e.target.value
                                  }))
                                }
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-mono font-bold text-xs"
                              >
                                {nextMachines.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.code} - {m.name} ({m.status})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2 sm:ml-auto">
                              <button
                                onClick={() => handleAdvanceStage(order, 'WEAVING')}
                                disabled={actionLoading}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <ArrowRight className="w-4 h-4" />
                                Complete Spinning &rarr; Advance to Weaving
                              </button>

                              <button
                                onClick={() => handleFastTrackProduction(order)}
                                disabled={actionLoading}
                                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                title="Fast-track all 3 steps directly to QC"
                              >
                                ⚡ Fast-Track to QC
                              </button>
                            </div>
                          </div>
                        )}

                        {isWeaving && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-slate-600">Next Dyeing Jet:</span>
                              <select
                                value={targetMachineSelections[prodId] || nextMachines[0]?.id || ''}
                                onChange={(e) =>
                                  setTargetMachineSelections((prev) => ({
                                    ...prev,
                                    [prodId]: e.target.value
                                  }))
                                }
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-mono font-bold text-xs"
                              >
                                {nextMachines.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.code} - {m.name} ({m.status})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2 sm:ml-auto">
                              <button
                                onClick={() => handleAdvanceStage(order, 'DYEING')}
                                disabled={actionLoading}
                                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <ArrowRight className="w-4 h-4" />
                                Complete Weaving &rarr; Advance to Dyeing
                              </button>

                              <button
                                onClick={() => handleFastTrackProduction(order)}
                                disabled={actionLoading}
                                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                              >
                                ⚡ Fast-Track to QC
                              </button>
                            </div>
                          </div>
                        )}

                        {isDyeing && (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-teal-800 font-medium">
                              Final manufacturing step in progress on dyeing jet. Ready to inspect fabric!
                            </span>
                            <button
                              onClick={() => {
                                setSelectedProdForQc(run || { id: order.id });
                                setQcForm({
                                  outcome: 'GOOD',
                                  defectNotes: '',
                                  defectType: 'UNEVEN_WEAVING',
                                  rerunIfDefective: true
                                });
                                setIsQcModalOpen(true);
                              }}
                              className="px-5 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Complete Dyeing & Open Step 3 QC Inspection &rarr;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Quality Check History & Defect Notice */}
      {activeStepTab === '3' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 3: Quality Check & Defect Loss Tracker</h2>
              <p className="text-xs text-slate-500">
                Only good fabrics proceed to dispatch. If defective, yarn was wasted ($0 revenue earned) and the mill must rerun production.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Good Fabric Outcome
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                When the fabric passes quality inspection with zero or minor defects, it is cleared immediately for Step 4 (Dispatch) to be delivered to the buyer.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Defective Fabric Outcome
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                If defective fabric is rejected during inspection, the yarn consumed cannot be returned and no money will be received from the buyer. A new rerun production job is scheduled to fulfill the order.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8DFEF] p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Recent Quality Inspections</h3>
            {orders.filter((o) => o.inspection).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No quality inspection logs yet. Finish an active production job to inspect fabric.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.filter((o) => o.inspection).map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{o.customer?.name} &bull; {o.fabric.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Roll: {o.inspection?.rollNumber}</div>
                    </div>
                    <div>
                      {o.inspection?.status === 'PASSED' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          PASSED &bull; Ready for Dispatch
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                          REJECTED &bull; Defective Waste
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: Dispatch & Delivery */}
      {activeStepTab === '4' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DFEF] pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 4: Dispatch & Deliver to Buyer</h2>
              <p className="text-xs text-slate-500">
                Only passed and approved fabrics are cleared for dispatch. Once dispatched and delivered to the buyer, orders are removed from the active queue and logged in Dispatch History.
              </p>
            </div>

            {/* Sub-tabs: Ready for Dispatch vs Dispatch History */}
            <div className="flex items-center gap-1.5 bg-[#F5EFFB] p-1 rounded-2xl border border-[#E8DFEF]">
              <button
                onClick={() => setDispatchTab('ready')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatchTab === 'ready'
                    ? 'bg-white text-[#503568] shadow-xs'
                    : 'text-[#766D82] hover:text-[#292235]'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-[#7950A8]" />
                <span>Ready for Dispatch</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEE5F7] text-[#503568]">
                  {step4Orders.length}
                </span>
              </button>

              <button
                onClick={() => setDispatchTab('history')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatchTab === 'history'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-[#766D82] hover:text-[#292235]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dispatch History</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {deliveredOrders.length}
                </span>
              </button>
            </div>
          </div>

          {/* Sub-Tab 1: Ready for Dispatch */}
          {dispatchTab === 'ready' && (
            <>
              {step4Orders.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-base font-bold text-slate-800">No approved fabrics pending dispatch</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    All completed fabrics have been dispatched & delivered to buyers! As fabrics pass Step 3 inspection, they will arrive here ready to ship.
                  </p>
                  {deliveredOrders.length > 0 && (
                    <button
                      onClick={() => setDispatchTab('history')}
                      className="mt-4 px-4 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>View Dispatch History ({deliveredOrders.length} delivered)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {step4Orders.map((order) => (
                    <div key={order.id} className="bg-white p-5 rounded-3xl border border-[#E8DFEF] shadow-2xs space-y-4 hover:shadow-xs transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-mono text-xs font-bold text-[#503568] px-2.5 py-1 rounded-lg bg-[#EEE5F7] inline-block">
                            {order.orderNumber}
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm mt-1.5">{order.fabric.name}</h3>
                          <p className="text-xs text-slate-500">
                            Buyer: <strong className="text-slate-800">{order.customer?.name}</strong> {order.customer?.company ? `(${order.customer.company})` : ''}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          APPROVED & READY
                        </span>
                      </div>

                      <div className="p-3 bg-[#FAF7FC] rounded-2xl border border-[#E8DFEF] grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Approved Quantity:</span>
                          <span className="font-bold text-slate-900 text-sm">{order.fabric.quantity} {order.fabric.unit}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block text-[11px]">Commercial Invoice:</span>
                          <span className="font-bold text-emerald-700 font-mono text-sm">₹{order.fabric.totalValue.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-[#E8DFEF]/60 text-[11px] text-[#766D82]">
                          Delivery Destination: <strong className="text-[#292235]">{order.customer?.address || 'Buyer Central Warehouse'}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedOrderForDispatch(order);
                          setDispatchForm({
                            vehicleNumber: 'MH-12-TX-4401',
                            driverName: 'Ramesh Shinde',
                            driverPhone: '+91 98221 44550',
                            destination: order.customer?.address || 'Buyer Central Warehouse'
                          });
                          setIsDispatchModalOpen(true);
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Dispatch & Deliver to Buyer</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Sub-Tab 2: Dispatch & Delivery History */}
          {dispatchTab === 'history' && (
            <div className="space-y-4">
              {deliveredOrders.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
                  <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">No completed dispatches yet</p>
                  <p className="text-xs text-slate-400 mt-1">Once an order is dispatched and delivered, its complete delivery record will be saved here.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-[#E8DFEF] shadow-2xs overflow-hidden">
                  <div className="p-4 bg-[#FAF7FC] border-b border-[#E8DFEF] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Dispatched & Received by Buyer History</h3>
                      <p className="text-xs text-slate-500">All fabric orders successfully shipped, delivered, and confirmed received by buyers.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                      {deliveredOrders.length} Completed Shipments
                    </span>
                  </div>

                  <div className="divide-y divide-[#F3EEF8]">
                    {deliveredOrders.map((o) => {
                      const d = o.dispatch;
                      return (
                        <div key={o.id} className="p-4 sm:p-5 hover:bg-[#FAF7FC] transition-colors space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {d?.dispatchNumber && (
                                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                                  {d.dispatchNumber}
                                </span>
                              )}
                              <span className="font-mono text-xs font-bold text-[#503568] bg-[#EEE5F7] px-2 py-0.5 rounded-lg">
                                {o.orderNumber}
                              </span>
                              <span className="text-xs text-slate-500">
                                {d?.dispatchedAt ? new Date(d.dispatchedAt).toLocaleString('en-IN') : new Date(o.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 self-start sm:self-auto">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>DELIVERED & RECEIVED BY BUYER</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                            <div>
                              <span className="text-slate-500 block text-[11px]">Buyer & Destination:</span>
                              <strong className="text-slate-900 block">{o.customer?.name}</strong>
                              <span className="text-slate-500 text-[11px]">{d?.destination || o.customer?.address || 'Buyer Central Warehouse'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[11px]">Dispatched Fabric:</span>
                              <strong className="text-slate-900 block">{o.fabric.quantity} {o.fabric.unit}</strong>
                              <span className="text-slate-500 text-[11px]">{o.fabric.name}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[11px]">Transport & Logistics:</span>
                              <strong className="font-mono text-[#503568] block">{d?.vehicleNumber || 'MH-12-TX-4401'}</strong>
                              <span className="text-slate-500 text-[11px]">Driver: {d?.driverName || 'Ramesh Shinde'} {d?.driverPhone ? `(${d.driverPhone})` : ''}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-xs">
                            <span className="text-slate-500 text-[11px]">Sales Revenue Recognized:</span>
                            <span className="font-mono font-bold text-emerald-700 text-sm">
                              ₹{o.fabric.totalValue.toLocaleString('en-IN')} (Invoice Paid)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 5: Owner Monthly Financial Statement & Transactions */}
      {activeStepTab === '5' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 5: Owner Monthly Financial Statement & Transactions</h2>
              <p className="text-xs text-slate-500">
                Final profit or loss tracked strictly on: Total Spent on Raw Material Yarn vs Total Earned from Selling Finished Fabric.
              </p>
            </div>
          </div>

          {/* Financial Statement Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sales Revenue */}
            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                <span>Fabric Sales Revenue</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black font-mono text-emerald-900">
                ₹{(financials?.summary?.totalFabricSalesRevenue || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Money received from buyers for approved fabric rolls delivered.
              </p>
            </div>

            {/* Yarn Expense */}
            <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between">
                <span>Total Spent on Yarn</span>
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-3xl font-black font-mono text-rose-900">
                ₹{(financials?.summary?.totalSpentOnYarn || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Money paid to trusted yarn suppliers for spinning cones & fibers.
              </p>
            </div>

            {/* Final Profit / Loss */}
            <div className={`p-6 rounded-3xl border ${(financials?.summary?.netProfitOrLoss || 0) >= 0 ? 'bg-purple-50 border-purple-200 text-purple-950' : 'bg-amber-50 border-amber-200 text-amber-950'} space-y-2`}>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center justify-between">
                <span>Final Profit or Loss</span>
                <DollarSign className="w-4 h-4 text-purple-700" />
              </div>
              <div className="text-3xl font-black font-mono text-purple-950">
                ₹{(financials?.summary?.netProfitOrLoss || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                {(financials?.summary?.netProfitOrLoss || 0) >= 0 ? 'Net Mill Profit (Sales Revenue - Yarn Purchases)' : 'Net Deficit across accounting period'}
              </p>
            </div>
          </div>

          {/* Monthly Transactions Feed */}
          <div className="bg-white rounded-3xl border border-[#E8DFEF] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Monthly Transactions Ledger</h3>
              <span className="text-xs font-semibold text-slate-500">
                {financials?.transactions?.length || 0} financial events recorded
              </span>
            </div>

            {!financials?.transactions || financials.transactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No transactions recorded for this period.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {financials.transactions.map((tx) => (
                  <div key={tx.id} className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 rounded-xl px-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${tx.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {tx.isPositive ? '+' : '-'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{tx.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Ref: {tx.reference} &bull; {new Date(tx.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold text-sm ${tx.isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.isPositive ? '+' : '-'}₹{tx.amount.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{tx.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: NEW BUYER ORDER */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-lg shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">New Buyer Fabric Order</h3>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Buyer</label>
                <select
                  value={orderForm.buyerId}
                  onChange={(e) => setOrderForm({ ...orderForm, buyerId: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="">-- Or Create New Buyer Below --</option>
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.company || 'Buyer'})</option>
                  ))}
                </select>
              </div>

              {!orderForm.buyerId && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-purple-50/50 rounded-2xl border border-purple-100">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">New Buyer Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Exports"
                      value={orderForm.newBuyerName}
                      onChange={(e) => setOrderForm({ ...orderForm, newBuyerName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                      required={!orderForm.buyerId}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">10-Digit Phone *</label>
                    <input
                      type="text"
                      maxLength="10"
                      placeholder="9876543210"
                      value={orderForm.newBuyerPhone}
                      onChange={(e) => setOrderForm({ ...orderForm, newBuyerPhone: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                      required={!orderForm.buyerId}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fabric Product *</label>
                <select
                  required
                  value={orderForm.fabricId}
                  onChange={(e) => handleFabricSelect(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold"
                >
                  <option value="">-- Choose Fabric --</option>
                  {fabrics.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Yarn Recipe Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Raw Material Yarn *</label>
                  <select
                    required
                    value={orderForm.yarnId}
                    onChange={(e) => setOrderForm({ ...orderForm, yarnId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium text-xs"
                  >
                    <option value="">-- Choose Yarn --</option>
                    {yarns.map((y) => (
                      <option key={y.id} value={y.id}>{y.name} ({y.currentStock} {y.unit} in stock)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Yarn Ratio (KG / Unit Fabric) *</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    required
                    value={orderForm.yarnRatio}
                    onChange={(e) => setOrderForm({ ...orderForm, yarnRatio: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Order Quantity (Meters) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price per Meter (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.unitPrice}
                    onChange={(e) => setOrderForm({ ...orderForm, unitPrice: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold font-mono"
                  />
                </div>
              </div>

              {/* Dynamic Yarn Recipe Banner */}
              <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold">Yarn Consumption Recipe:</span>
                  <div className="text-[11px] text-purple-700 mt-0.5">
                    1 unit fabric consumes {orderForm.yarnRatio || 1.25} KG raw yarn
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-purple-600 font-medium">Total Yarn Required:</span>
                  <div className="font-mono font-black text-sm text-[#503568]">
                    {Math.round((parseFloat(orderForm.quantity) || 0) * (parseFloat(orderForm.yarnRatio) || 1.25) * 100) / 100} KG Yarn
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl font-bold shadow-xs"
                >
                  Create Order & Check Yarn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ORDER YARN FROM SUPPLIER (With Add Supplier on the fly) */}
      {isYarnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-lg shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Order Raw Material Yarn from Supplier</h3>
              <button onClick={() => setIsYarnModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleOrderYarn} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Choose Supplier</label>
                <button
                  type="button"
                  onClick={() => setYarnForm({ ...yarnForm, isNewSupplier: !yarnForm.isNewSupplier })}
                  className="text-xs text-[#7950A8] font-bold hover:underline"
                >
                  {yarnForm.isNewSupplier ? '← Pick Existing Supplier' : '+ Add New Supplier to List'}
                </button>
              </div>

              {!yarnForm.isNewSupplier ? (
                <select
                  required
                  value={yarnForm.supplierId}
                  onChange={(e) => setYarnForm({ ...yarnForm, supplierId: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="">-- Select Trusted Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.yarnTypesSupplied || 'Yarn Mill'})</option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">New Supplier Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Vardhman Textiles Spinners"
                      required
                      value={yarnForm.newSupplierName}
                      onChange={(e) => setYarnForm({ ...yarnForm, newSupplierName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Supplier Phone</label>
                    <input
                      type="text"
                      placeholder="9876501234"
                      value={yarnForm.newSupplierPhone}
                      onChange={(e) => setYarnForm({ ...yarnForm, newSupplierPhone: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Raw Material Yarn *</label>
                <select
                  required
                  value={yarnForm.yarnId}
                  onChange={(e) => setYarnForm({ ...yarnForm, yarnId: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold"
                >
                  <option value="">-- Choose Yarn Variety --</option>
                  {yarns.map((y) => (
                    <option key={y.id} value={y.id}>{y.name} (Stock: {y.currentStock} {y.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Order Quantity (KG) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={yarnForm.quantity}
                    onChange={(e) => setYarnForm({ ...yarnForm, quantity: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price per KG (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={yarnForm.unitPrice}
                    onChange={(e) => setYarnForm({ ...yarnForm, unitPrice: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs">
                <strong>Instant Restock:</strong> Checking "Auto-receive to inventory" will immediately add {yarnForm.quantity} KG to warehouse stock so production can proceed without delay.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsYarnModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Order & Receive Yarn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUALITY INSPECTION (Good vs Defective) */}
      {isQcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Quality Inspection Outcome</h3>
              <button onClick={() => setIsQcModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleQualityInspect} className="space-y-4">
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">Inspection Result *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setQcForm({ ...qcForm, outcome: 'GOOD' })}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                      qcForm.outcome === 'GOOD'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>GOOD FABRIC</span>
                    <span className="text-[10px] font-normal text-emerald-700">Ready for Dispatch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQcForm({ ...qcForm, outcome: 'DEFECTIVE' })}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                      qcForm.outcome === 'DEFECTIVE'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <span>DEFECTIVE</span>
                    <span className="text-[10px] font-normal text-rose-700">Yarn Wasted ($0 Earned)</span>
                  </button>
                </div>
              </div>

              {qcForm.outcome === 'DEFECTIVE' && (
                <div className="space-y-3 p-3 bg-rose-50/60 rounded-2xl border border-rose-200">
                  <div>
                    <label className="block font-semibold text-rose-900 mb-1">Defect Notes / Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Warp breakage / Uneven dyeing color mismatch"
                      value={qcForm.defectNotes}
                      onChange={(e) => setQcForm({ ...qcForm, defectNotes: e.target.value })}
                      className="w-full p-2 border border-rose-300 rounded-xl bg-white text-rose-950 font-medium"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-rose-900 font-bold">
                    <input
                      type="checkbox"
                      checked={qcForm.rerunIfDefective}
                      onChange={(e) => setQcForm({ ...qcForm, rerunIfDefective: e.target.checked })}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Re-run production for buyer to fulfill order</span>
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQcModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-white font-bold shadow-xs ${
                    qcForm.outcome === 'GOOD' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DISPATCH & DELIVER */}
      {isDispatchModalOpen && selectedOrderForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Dispatch Fabric to Buyer</h3>
              <button onClick={() => setIsDispatchModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleDispatch} className="space-y-3.5">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200">
                <div className="font-bold text-purple-900 text-sm">{selectedOrderForDispatch.customer?.name}</div>
                <div className="text-xs text-purple-800">
                  {selectedOrderForDispatch.fabric.quantity} {selectedOrderForDispatch.fabric.unit} &bull; {selectedOrderForDispatch.fabric.name}
                </div>
                <div className="text-xs font-mono font-bold text-purple-950 mt-1">
                  Sales Invoice Total: ₹{selectedOrderForDispatch.fabric.totalValue.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle Number *</label>
                <input
                  type="text"
                  required
                  value={dispatchForm.vehicleNumber}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold font-mono"
                  placeholder="e.g. MH-12-TX-4401"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.driverName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driverName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                    placeholder="Driver Name"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Driver Phone *</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.driverPhone}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driverPhone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                    placeholder="+91 98221 44550"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destination Address *</label>
                <input
                  type="text"
                  required
                  value={dispatchForm.destination}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm Delivery & Recognize Revenue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
