import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Search,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  X,
  Package,
  Activity,
  User,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

const STAGES = ['SPINNING', 'WEAVING', 'DYEING', 'FINISHING'];

export function ProductionView({ dbConnected }) {
  const [orders, setOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [machines, setMachines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');

  // Modals & Slide-overs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('timeline'); // 'timeline', 'materials', 'trace'
  const [detailOrder, setDetailOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [materialReqs, setMaterialReqs] = useState(null);
  const [orderTrace, setOrderTrace] = useState(null);

  // Stage Action Modals
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Start Form State
  const [startData, setStartData] = useState({
    machineId: '',
    operatorId: '',
    notes: '',
  });

  // Complete Form State
  const [completeData, setCompleteData] = useState({
    outputQuantity: '',
    wasteQuantity: '0',
    notes: '',
    actuals: [],
  });

  // Create Order Form State
  const [formData, setFormData] = useState({
    salesOrderId: '',
    productId: '',
    targetQuantity: '1000',
    machineId: '',
    startDate: new Date().toISOString().split('T')[0],
    materials: [
      { rawMaterialId: '', stage: 'SPINNING', plannedQuantity: '500' }
    ],
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [ordRes, soRes, prodRes, rawRes, mchRes, empRes] = await Promise.allSettled([
        api.getProductionOrders(),
        api.getSalesOrders(),
        api.getProducts({ type: 'FINISHED_GOODS' }),
        api.getProducts({ type: 'RAW_MATERIAL' }),
        api.getMachines(),
        api.getEmployees({ status: 'ACTIVE' }),
      ]);

      if (ordRes.status === 'fulfilled' && ordRes.value?.data) {
        setOrders(ordRes.value.data);
      }
      if (soRes.status === 'fulfilled' && soRes.value?.data) {
        setSalesOrders(soRes.value.data);
      }
      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        setProducts(prodRes.value.data);
      }
      if (rawRes.status === 'fulfilled' && rawRes.value?.data) {
        setRawMaterials(rawRes.value.data);
      }
      if (mchRes.status === 'fulfilled' && mchRes.value?.data) {
        setMachines(mchRes.value.data);
      }
      if (empRes.status === 'fulfilled' && empRes.value?.data) {
        setEmployees(empRes.value.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch production data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openOrderDetail = async (order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    setDetailTab('timeline');
    try {
      const [detailRes, reqRes, traceRes] = await Promise.allSettled([
        api.getProductionOrderById(order.id),
        api.getMaterialRequirements(order.id),
        api.getOrderTrace(order.id),
      ]);

      if (detailRes.status === 'fulfilled' && detailRes.value?.data) {
        setDetailOrder(detailRes.value.data);
      } else {
        setDetailOrder(order);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value?.data) {
        setMaterialReqs(reqRes.value.data);
      }
      if (traceRes.status === 'fulfilled' && traceRes.value?.data) {
        setOrderTrace(traceRes.value.data);
      }
    } catch {
      setDetailOrder(order);
    } finally {
      setLoadingDetail(false);
    }
  };

  const refreshDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const [detailRes, reqRes, traceRes, ordersRes] = await Promise.allSettled([
        api.getProductionOrderById(id),
        api.getMaterialRequirements(id),
        api.getOrderTrace(id),
        api.getProductionOrders(),
      ]);

      if (detailRes.status === 'fulfilled' && detailRes.value?.data) {
        setDetailOrder(detailRes.value.data);
        setSelectedOrder(detailRes.value.data);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value?.data) {
        setMaterialReqs(reqRes.value.data);
      }
      if (traceRes.status === 'fulfilled' && traceRes.value?.data) {
        setOrderTrace(traceRes.value.data);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
        setOrders(ordersRes.value.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Sales Order selection in Create Form
  const handleSalesOrderSelect = (soId) => {
    const so = salesOrders.find((s) => s.id === soId);
    let autoProdId = formData.productId;
    let autoQty = formData.targetQuantity;

    if (so && so.items && so.items.length > 0) {
      autoProdId = so.items[0].productId || autoProdId;
      autoQty = String(so.items[0].quantity || 1000);
    }

    setFormData({
      ...formData,
      salesOrderId: soId,
      productId: autoProdId,
      targetQuantity: autoQty,
    });
  };

  const handleAddMaterialRow = () => {
    setFormData({
      ...formData,
      materials: [
        ...formData.materials,
        {
          rawMaterialId: rawMaterials[0]?.id || '',
          stage: 'SPINNING',
          plannedQuantity: '200',
        },
      ],
    });
  };

  const handleRemoveMaterialRow = (idx) => {
    setFormData({
      ...formData,
      materials: formData.materials.filter((_, i) => i !== idx),
    });
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const payload = {
        salesOrderId: formData.salesOrderId || null,
        productId: formData.productId,
        targetQuantity: parseFloat(formData.targetQuantity),
        machineId: formData.machineId || null,
        startDate: formData.startDate || null,
        materials: formData.materials.filter((m) => m.rawMaterialId),
      };

      await api.createProductionOrder(payload);
      setSuccessMsg('Production order created successfully!');
      setIsCreateOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create production order');
    } finally {
      setActionLoading(false);
    }
  };

  // Start Stage
  const handleStartStage = async (e) => {
    e.preventDefault();
    if (!detailOrder) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.startStage(detailOrder.id, {
        machineId: startData.machineId || null,
        operatorId: startData.operatorId || null,
        notes: startData.notes || null,
      });
      setSuccessMsg(`Stage ${detailOrder.stage} started successfully!`);
      setIsStartOpen(false);
      refreshDetail(detailOrder.id);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start stage');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Stage
  const handleCompleteStage = async (e) => {
    e.preventDefault();
    if (!detailOrder) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.completeStage(detailOrder.id, {
        outputQuantity: parseFloat(completeData.outputQuantity),
        wasteQuantity: parseFloat(completeData.wasteQuantity) || 0,
        notes: completeData.notes || null,
      });
      setSuccessMsg(`Stage ${detailOrder.stage} completed and stock recorded!`);
      setIsCompleteOpen(false);
      refreshDetail(detailOrder.id);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete stage');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !searchTerm ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.product?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.salesOrder?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesStage = stageFilter === 'ALL' || o.stage === stageFilter;

    return matchesSearch && matchesStatus && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-start justify-between gap-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-start justify-between gap-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>{successMsg}</div>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO #, Product, Buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNED">PLANNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="PAUSED">PAUSED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Stages</option>
            <option value="SPINNING">Spinning</option>
            <option value="WEAVING">Weaving</option>
            <option value="DYEING">Dyeing</option>
            <option value="FINISHING">Finishing</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Production Order
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Buyer SO</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4 text-right">Target Qty</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No production orders found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const pct = order.progressPct || 0;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => openOrderDetail(order)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-sky-700">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{order.product?.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{order.product?.code}</div>
                      </td>
                      <td className="py-3 px-4">
                        {order.salesOrder ? (
                          <span className="font-mono text-slate-700 font-medium">
                            {order.salesOrder.orderNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">MTO Inventory</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                          {order.stage}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            order.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : order.status === 'IN_PROGRESS'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : order.status === 'PAUSED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 w-40">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>{pct}%</span>
                          <span>{order.producedQuantity} / {order.targetQuantity}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 100 ? 'bg-emerald-500' : 'bg-sky-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        {order.targetQuantity} {order.product?.unit}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sky-600 font-semibold hover:text-sky-800 text-[11px] inline-flex items-center gap-1">
                          Timeline <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ORDER SLIDE-OVER */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">New Production Order</h3>
                  <p className="text-xs text-slate-500">Initiate factory run linked to a buyer order or stock</p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} id="create-order-form" className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Link to Sales Order (Optional)</label>
                  <select
                    value={formData.salesOrderId}
                    onChange={(e) => handleSalesOrderSelect(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="">-- Standalone Mill Production (Inventory) --</option>
                    {salesOrders.map((so) => (
                      <option key={so.id} value={so.id}>
                        {so.orderNumber} - {so.customer?.name} ({so.items?.length || 0} items)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Finished Goods Product *</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code}) - {p.category} [{p.unit}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Quantity *</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={formData.targetQuantity}
                      onChange={(e) => setFormData({ ...formData, targetQuantity: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Materials Requirement List */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-semibold text-slate-700">Planned Raw Materials</label>
                    <button
                      type="button"
                      onClick={handleAddMaterialRow}
                      className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Material
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.materials.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <select
                          value={m.rawMaterialId}
                          onChange={(e) => {
                            const updated = [...formData.materials];
                            updated[idx].rawMaterialId = e.target.value;
                            setFormData({ ...formData, materials: updated });
                          }}
                          className="flex-1 p-1.5 border border-slate-300 rounded bg-white text-xs"
                          required
                        >
                          <option value="">-- Raw Material --</option>
                          {rawMaterials.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.code}) [{r.unit}]
                            </option>
                          ))}
                        </select>

                        <select
                          value={m.stage}
                          onChange={(e) => {
                            const updated = [...formData.materials];
                            updated[idx].stage = e.target.value;
                            setFormData({ ...formData, materials: updated });
                          }}
                          className="w-24 p-1.5 border border-slate-300 rounded bg-white text-xs"
                        >
                          <option value="SPINNING">Spinning</option>
                          <option value="WEAVING">Weaving</option>
                          <option value="DYEING">Dyeing</option>
                          <option value="FINISHING">Finishing</option>
                        </select>

                        <input
                          type="number"
                          placeholder="Qty"
                          step="any"
                          value={m.plannedQuantity}
                          onChange={(e) => {
                            const updated = [...formData.materials];
                            updated[idx].plannedQuantity = e.target.value;
                            setFormData({ ...formData, materials: updated });
                          }}
                          className="w-20 p-1.5 border border-slate-300 rounded bg-white text-xs text-right"
                          required
                        />

                        {formData.materials.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterialRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-order-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Create Order (PLANNED)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAIL MODAL & STAGE TIMELINE */}
      {isDetailOpen && detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-slate-900 font-mono">
                    {detailOrder.orderNumber}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-800 border border-violet-200">
                    Stage: {detailOrder.stage}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      detailOrder.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : detailOrder.status === 'IN_PROGRESS'
                        ? 'bg-sky-100 text-sky-800 border-sky-200'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {detailOrder.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Product: <strong>{detailOrder.product?.name}</strong> ({detailOrder.product?.code}) · Target: {detailOrder.targetQuantity} {detailOrder.product?.unit} · Produced: {detailOrder.producedQuantity} {detailOrder.product?.unit}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => refreshDetail(detailOrder.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDetail ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-tabs inside Detail Modal */}
            <div className="flex items-center gap-4 px-6 border-b border-slate-200 bg-white text-xs font-semibold">
              <button
                onClick={() => setDetailTab('timeline')}
                className={`py-3 border-b-2 transition-colors ${
                  detailTab === 'timeline'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Stage Timeline & Execution
              </button>
              <button
                onClick={() => setDetailTab('materials')}
                className={`py-3 border-b-2 transition-colors ${
                  detailTab === 'materials'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Material Consumption (Req vs Stock)
              </button>
              <button
                onClick={() => setDetailTab('trace')}
                className={`py-3 border-b-2 transition-colors ${
                  detailTab === 'trace'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Batch Traceability & QC
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {detailTab === 'timeline' && (
                <div className="space-y-6">
                  {/* Horizontal Stage Timeline */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-4">
                      Manufacturing Floor Progression
                    </h4>
                    <div className="grid grid-cols-4 gap-2 relative">
                      {STAGES.map((stg, idx) => {
                        const isCurrent = detailOrder.stage === stg && detailOrder.status !== 'COMPLETED';
                        const stageLog = detailOrder.stageLogs?.find((l) => l.stage === stg);
                        const isDone = stageLog?.status === 'COMPLETED';
                        const isInProgress = stageLog?.status === 'IN_PROGRESS';

                        return (
                          <div
                            key={stg}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              isDone
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : isInProgress
                                ? 'bg-sky-50 border-sky-400 text-sky-900 ring-2 ring-sky-300'
                                : isCurrent
                                ? 'bg-amber-50 border-amber-300 text-amber-900'
                                : 'bg-white border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider">Step 0{idx + 1}</div>
                            <div className="font-extrabold text-sm mt-0.5">{stg}</div>
                            <div className="text-[10px] mt-1">
                              {isDone ? (
                                <span className="font-semibold text-emerald-700">✓ Done ({stageLog.outputQuantity})</span>
                              ) : isInProgress ? (
                                <span className="font-semibold text-sky-700 animate-pulse">● In Progress</span>
                              ) : (
                                <span>Pending</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage Action Controls */}
                  {detailOrder.status !== 'COMPLETED' && (
                    <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/60 flex items-center justify-between">
                      <div>
                        <h5 className="font-bold text-sky-950 text-sm">
                          Active Stage: {detailOrder.stage}
                        </h5>
                        <p className="text-xs text-sky-700 mt-0.5">
                          {detailOrder.stageLogs?.some((l) => l.stage === detailOrder.stage && l.status === 'IN_PROGRESS')
                            ? `Stage is currently running on floor. Click "Complete Stage" once roll batch is ready.`
                            : `Ready to assign machine and start ${detailOrder.stage}.`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {detailOrder.stageLogs?.some((l) => l.stage === detailOrder.stage && l.status === 'IN_PROGRESS') ? (
                          <button
                            onClick={() => {
                              const activeLog = detailOrder.stageLogs?.find(
                                (l) => l.stage === detailOrder.stage && l.status === 'IN_PROGRESS'
                              );
                              setCompleteData({
                                outputQuantity: String(activeLog?.inputQuantity || detailOrder.targetQuantity),
                                wasteQuantity: '0',
                                notes: '',
                                actuals: [],
                              });
                              setIsCompleteOpen(true);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Complete Stage
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const matchMch = machines.find((m) => m.type === detailOrder.stage && m.status === 'IDLE');
                              setStartData({
                                machineId: matchMch?.id || '',
                                operatorId: employees[0]?.id || '',
                                notes: '',
                              });
                              setIsStartOpen(true);
                            }}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                          >
                            <Play className="w-4 h-4" /> Start Stage
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* History of Stage Logs */}
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs mb-3">Executed Stage History</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Stage</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Machine</th>
                            <th className="py-2.5 px-3">Operator</th>
                            <th className="py-2.5 px-3 text-right">Input Qty</th>
                            <th className="py-2.5 px-3 text-right">Output Qty</th>
                            <th className="py-2.5 px-3 text-right">Waste</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailOrder.stageLogs?.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-4 text-center text-slate-400">
                                No stages executed yet.
                              </td>
                            </tr>
                          ) : (
                            detailOrder.stageLogs?.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-semibold text-slate-900">{log.stage}</td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      log.status === 'COMPLETED'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-sky-50 text-sky-700'
                                    }`}
                                  >
                                    {log.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {log.machine ? `${log.machine.name} (${log.machine.code})` : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {log.operator ? `${log.operator.name} (${log.operator.employeeCode})` : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                  {log.inputQuantity}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  {log.outputQuantity}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                                  {log.wasteQuantity}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'materials' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">Raw Material Requirement vs Inventory Stock</h4>
                      <p className="text-slate-500 text-xs">
                        Checks available warehouse stock against planned recipe. Red badge indicates shortage.
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Material</th>
                          <th className="py-2.5 px-3">Stage</th>
                          <th className="py-2.5 px-3 text-right">Planned Qty</th>
                          <th className="py-2.5 px-3 text-right">Consumed</th>
                          <th className="py-2.5 px-3 text-right">In Warehouse</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {materialReqs?.materials?.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-4 text-center text-slate-400">
                              No materials linked to this order.
                            </td>
                          </tr>
                        ) : (
                          materialReqs?.materials?.map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{m.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{m.rawMaterialCode}</div>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-violet-700">{m.stage}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                                {m.plannedQuantity} {m.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                {m.actualConsumed} {m.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {m.availableStock} {m.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {m.status === 'SHORT' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    SHORT (-{m.shortage} {m.unit})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    OK Available
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailTab === 'trace' && orderTrace && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Buyer Sales Order</span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {orderTrace.salesOrder ? orderTrace.salesOrder.orderNumber : 'N/A (Stock Run)'}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {orderTrace.salesOrder?.customer?.name} · {orderTrace.salesOrder?.customer?.companyName}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Finished Roll Product</span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{orderTrace.product?.name}</div>
                      <div className="text-xs text-slate-600 mt-0.5 font-mono">{orderTrace.product?.code}</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-800 text-xs mb-2">Quality Inspection Slips ({orderTrace.inspections?.length || 0})</h5>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Roll #</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Meters</th>
                            <th className="py-2.5 px-3">Inspector</th>
                            <th className="py-2.5 px-3">Defect Breakdown</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {orderTrace.inspections?.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="py-4 text-center text-slate-400">
                                No rolls inspected yet.
                              </td>
                            </tr>
                          ) : (
                            orderTrace.inspections?.map((i) => (
                              <tr key={i.rollNumber} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{i.rollNumber}</td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      i.status === 'PASSED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : i.status === 'REWORK'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {i.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold">{i.metersInspected}m</td>
                                <td className="py-2.5 px-3 text-slate-600">{i.inspector}</td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {i.defects?.length > 0
                                    ? i.defects.map((d, dIdx) => `${d.defectType} (${d.defectQty})`).join(', ')
                                    : 'None (Clean roll)'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                {detailOrder.metrics && (
                  <>
                    <span className="text-slate-600">
                      QC Rolls: <strong>{detailOrder.metrics.passedRolls} Passed</strong> / {detailOrder.metrics.inspectedRolls} Total
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        detailOrder.metrics.defectBadge === 'GREEN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : detailOrder.metrics.defectBadge === 'AMBER'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Defect Rate: {detailOrder.metrics.defectRate}%
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* START STAGE MODAL */}
      {isStartOpen && detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md shadow-2xl text-xs space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm">Start Stage: {detailOrder.stage}</h4>
              <button onClick={() => setIsStartOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStartStage} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Machine ({detailOrder.stage} floor)</label>
                <select
                  value={startData.machineId}
                  onChange={(e) => setStartData({ ...startData, machineId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Auto-Assign / Unassigned --</option>
                  {machines
                    .filter((m) => m.type === detailOrder.stage)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code}) - Status: {m.status}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operator / Master</label>
                <select
                  value={startData.operatorId}
                  onChange={(e) => setStartData({ ...startData, operatorId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Select Worker --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employeeCode}) - {e.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shift Notes</label>
                <textarea
                  rows="2"
                  value={startData.notes}
                  onChange={(e) => setStartData({ ...startData, notes: e.target.value })}
                  placeholder="Parameters, yarn tension, dye shade code..."
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStartOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Start
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE STAGE MODAL */}
      {isCompleteOpen && detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md shadow-2xl text-xs space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Complete Stage: {detailOrder.stage}</h4>
                <p className="text-slate-500 text-[11px]">Records roll output and deducts raw yarn/dyes atomically.</p>
              </div>
              <button onClick={() => setIsCompleteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCompleteStage} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Output Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={completeData.outputQuantity}
                    onChange={(e) => setCompleteData({ ...completeData, outputQuantity: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waste / Scrap Qty</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={completeData.wasteQuantity}
                    onChange={(e) => setCompleteData({ ...completeData, wasteQuantity: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Completion Notes</label>
                <textarea
                  rows="2"
                  value={completeData.notes}
                  onChange={(e) => setCompleteData({ ...completeData, notes: e.target.value })}
                  placeholder="Batch lot number, machine speed, quality notes..."
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <strong>Inventory Guard:</strong>
                <p>
                  Completing this stage deducts required raw materials from warehouse stock. If completing <strong>FINISHING</strong>, finished goods stock will be added.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompleteOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Complete & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
