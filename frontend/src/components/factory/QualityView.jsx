import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  ArrowRight,
  X,
  ShieldCheck,
  Package,
  Layers,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

const DEFECT_TYPES = ['HOLES', 'COLOR_MISMATCH', 'UNEVEN_WEAVING', 'STAIN', 'OTHER'];
const SEVERITIES = ['MINOR', 'MAJOR', 'CRITICAL'];

export function QualityView({ dbConnected }) {
  const [inspections, setInspections] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Log Inspection Slide-over
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logData, setLogData] = useState({
    productionOrderId: '',
    rollNumber: '',
    metersInspected: '120',
    status: 'PASSED',
    inspectorName: 'Anil Gupta',
    notes: '',
    defects: [],
  });

  // Re-inspect Modal for REWORK
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [isReinspectOpen, setIsReinspectOpen] = useState(false);
  const [reinspectStatus, setReinspectStatus] = useState('PASSED');
  const [reinspectNotes, setReinspectNotes] = useState('');
  const [reinspectLoading, setReinspectLoading] = useState(false);

  // Dispatch Readiness Panel State
  const [selectedSoId, setSelectedSoId] = useState('');
  const [dispatchReadyData, setDispatchReadyData] = useState(null);
  const [loadingDispatchReady, setLoadingDispatchReady] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [inspRes, poRes, soRes] = await Promise.allSettled([
        api.getInspections(),
        api.getProductionOrders(),
        api.getSalesOrders(),
      ]);

      if (inspRes.status === 'fulfilled' && inspRes.value?.data) {
        setInspections(inspRes.value.data);
      }
      if (poRes.status === 'fulfilled' && poRes.value?.data) {
        setProductionOrders(poRes.value.data);
      }
      if (soRes.status === 'fulfilled' && soRes.value?.data) {
        setSalesOrders(soRes.value.data);
        if (soRes.value.data.length > 0 && !selectedSoId) {
          const firstSoId = soRes.value.data[0].id;
          setSelectedSoId(firstSoId);
          fetchDispatchReady(firstSoId);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch quality inspections');
    } finally {
      setLoading(false);
    }
  };

  const fetchDispatchReady = async (soId) => {
    if (!soId) return;
    setLoadingDispatchReady(true);
    try {
      const res = await api.getDispatchReadyBySalesOrder(soId);
      if (res?.data) {
        setDispatchReadyData(res.data);
      }
    } catch {
      setDispatchReadyData(null);
    } finally {
      setLoadingDispatchReady(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSoChange = (soId) => {
    setSelectedSoId(soId);
    fetchDispatchReady(soId);
  };

  const handleAddDefectRow = () => {
    setLogData({
      ...logData,
      defects: [
        ...logData.defects,
        {
          defectType: 'HOLES',
          defectQty: '1',
          severity: 'MINOR',
          location: 'Meter 45',
          notes: '',
        },
      ],
    });
  };

  const handleRemoveDefectRow = (idx) => {
    setLogData({
      ...logData,
      defects: logData.defects.filter((_, i) => i !== idx),
    });
  };

  const handleLogInspection = async (e) => {
    e.preventDefault();
    setLogLoading(true);
    setErrorMsg(null);
    try {
      const payload = {
        ...logData,
        metersInspected: parseFloat(logData.metersInspected),
      };

      await api.createInspection(payload);
      setSuccessMsg(`Roll ${logData.rollNumber} inspection logged successfully!`);
      setIsLogOpen(false);
      setLogData({
        productionOrderId: '',
        rollNumber: '',
        metersInspected: '120',
        status: 'PASSED',
        inspectorName: 'Anil Gupta',
        notes: '',
        defects: [],
      });
      loadData();
      if (selectedSoId) fetchDispatchReady(selectedSoId);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to log inspection');
    } finally {
      setLogLoading(false);
    }
  };

  const handleReinspect = async (e) => {
    e.preventDefault();
    if (!selectedInspection) return;
    setReinspectLoading(true);
    setErrorMsg(null);
    try {
      await api.updateInspection(selectedInspection.id, {
        status: reinspectStatus,
        notes: reinspectNotes,
      });
      setSuccessMsg(`Roll ${selectedInspection.rollNumber} re-inspected to ${reinspectStatus}!`);
      setIsReinspectOpen(false);
      loadData();
      if (selectedSoId) fetchDispatchReady(selectedSoId);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update re-inspection');
    } finally {
      setReinspectLoading(false);
    }
  };

  // Filtered Inspections
  const filteredInspections = inspections.filter((i) => {
    const matchesSearch =
      !searchTerm ||
      i.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.productionOrder?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.productionOrder?.product?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || i.status === statusFilter;

    return matchesSearch && matchesStatus;
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

      {/* DISPATCH READINESS GATEKEEPER CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5" /> Dispatch Readiness Guard
            </div>
            <h3 className="text-lg font-black text-white mt-1">
              Sales Order Quality Verification Gate
            </h3>
            <p className="text-xs text-slate-300">
              Only rolls marked <strong>PASSED</strong> can be loaded onto trucks. Uninspected, rework, or rejected rolls are strictly blocked.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <select
              value={selectedSoId}
              onChange={(e) => handleSoChange(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">-- Select Sales Order --</option>
              {salesOrders.map((so) => (
                <option key={so.id} value={so.id}>
                  {so.orderNumber} - {so.customer?.name} ({so.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {dispatchReadyData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                Passed Rolls
              </span>
              <div className="text-2xl font-black text-emerald-300 mt-1 font-mono">
                {dispatchReadyData.passedRolls}
              </div>
              <span className="text-[10px] text-slate-400">QC Approved</span>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                Blocked Rolls
              </span>
              <div className="text-2xl font-black text-amber-300 mt-1 font-mono">
                {dispatchReadyData.blockedRolls}
              </div>
              <span className="text-[10px] text-slate-400">Rework or Rejected</span>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Reserved / Dispatched
              </span>
              <div className="text-2xl font-black text-slate-300 mt-1 font-mono">
                {dispatchReadyData.reservedOrDispatchedRolls}
              </div>
              <span className="text-[10px] text-slate-400">Gate Out or Preparing</span>
            </div>

            <div className="bg-sky-500/20 rounded-xl p-3.5 border border-sky-500/40 text-center">
              <span className="text-[10px] uppercase font-bold text-sky-300 block tracking-wider">
                Dispatch-Ready Now
              </span>
              <div className="text-2xl font-black text-white mt-1 font-mono">
                {dispatchReadyData.dispatchReadyRolls}
              </div>
              <span className="text-[10px] text-sky-200">Eligible for Gate Pass</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Roll #, PO #..."
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
            <option value="ALL">All Inspection Statuses</option>
            <option value="PASSED">Passed Only</option>
            <option value="REWORK">Rework Only</option>
            <option value="REJECTED">Rejected Only</option>
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
            onClick={() => setIsLogOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-pink-600 text-white hover:bg-pink-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Roll Inspection
          </button>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Roll Slip #</th>
                <th className="py-3 px-4">Production Order</th>
                <th className="py-3 px-4">Fabric Product</th>
                <th className="py-3 px-4 text-right">Meters</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Inspector</th>
                <th className="py-3 px-4">Primary Defect</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No roll inspections found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredInspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {insp.rollNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-700">
                      {insp.productionOrder?.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {insp.productionOrder?.product?.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {insp.productionOrder?.product?.code}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {insp.metersInspected}m
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          insp.status === 'PASSED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : insp.status === 'REWORK'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {insp.status === 'PASSED' ? 'Pass' : insp.status === 'REWORK' ? 'Rework' : 'Fail'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {insp.inspectorName}
                    </td>
                    <td className="py-3 px-4">
                      {insp.defectType !== 'NONE' ? (
                        <span className="font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                          {insp.defectType} ({insp.defectSeverity})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None (Clean)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {insp.status === 'REWORK' && (
                        <button
                          onClick={() => {
                            setSelectedInspection(insp);
                            setReinspectStatus('PASSED');
                            setReinspectNotes('');
                            setIsReinspectOpen(true);
                          }}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" /> Re-inspect
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG INSPECTION SLIDE-OVER */}
      {isLogOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Log Roll Inspection</h3>
                  <p className="text-xs text-slate-500">Record roll inspection slip and defect breakdown</p>
                </div>
                <button
                  onClick={() => setIsLogOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLogInspection} id="log-inspection-form" className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Production Order Batch *</label>
                  <select
                    value={logData.productionOrderId}
                    onChange={(e) => {
                      const poId = e.target.value;
                      const order = productionOrders.find((p) => p.id === poId);
                      const rollCount = (order?.inspections?.length || 0) + 1;
                      const genRoll = `ROLL-${new Date().getFullYear()}-${String(rollCount).padStart(4, '0')}`;
                      setLogData({
                        ...logData,
                        productionOrderId: poId,
                        rollNumber: genRoll,
                      });
                    }}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  >
                    <option value="">-- Select Active Order --</option>
                    {productionOrders
                      .filter((p) => p.status !== 'PLANNED')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.orderNumber} - {p.product?.name} ({p.stage} - {p.status})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Roll Number *</label>
                    <input
                      type="text"
                      required
                      value={logData.rollNumber}
                      onChange={(e) => setLogData({ ...logData, rollNumber: e.target.value })}
                      placeholder="ROLL-2026-0001"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Meters Inspected *</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={logData.metersInspected}
                      onChange={(e) => setLogData({ ...logData, metersInspected: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Result Verdict *</label>
                    <select
                      value={logData.status}
                      onChange={(e) => setLogData({ ...logData, status: e.target.value })}
                      required
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold"
                    >
                      <option value="PASSED">PASS (Ready for Dispatch)</option>
                      <option value="REWORK">REWORK (Hold for Re-dye/Wash)</option>
                      <option value="REJECTED">FAIL (Scrap / Rejected)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">QC Inspector Name</label>
                    <input
                      type="text"
                      value={logData.inspectorName}
                      onChange={(e) => setLogData({ ...logData, inspectorName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                    />
                  </div>
                </div>

                {/* Defect Rows */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-semibold text-slate-700">
                      Defect Records {logData.status !== 'PASSED' && <span className="text-rose-500">* Required</span>}
                    </label>
                    <button
                      type="button"
                      onClick={handleAddDefectRow}
                      className="text-[11px] font-semibold text-pink-600 hover:text-pink-800 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Defect
                    </button>
                  </div>

                  <div className="space-y-2">
                    {logData.defects.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {logData.status === 'PASSED'
                          ? 'No defects recorded (clean roll). Note: PASSED cannot have MAJOR defects.'
                          : 'Please click "Add Defect" to record the defect reason for this hold.'}
                      </p>
                    ) : (
                      logData.defects.map((d, idx) => (
                        <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={d.defectType}
                              onChange={(e) => {
                                const updated = [...logData.defects];
                                updated[idx].defectType = e.target.value;
                                setLogData({ ...logData, defects: updated });
                              }}
                              className="flex-1 p-1.5 border border-slate-300 rounded bg-white text-xs font-semibold"
                            >
                              {DEFECT_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>

                            <select
                              value={d.severity}
                              onChange={(e) => {
                                const updated = [...logData.defects];
                                updated[idx].severity = e.target.value;
                                setLogData({ ...logData, defects: updated });
                              }}
                              className="w-24 p-1.5 border border-slate-300 rounded bg-white text-xs font-semibold text-rose-700"
                            >
                              {SEVERITIES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>

                            <input
                              type="number"
                              placeholder="Qty"
                              step="any"
                              value={d.defectQty}
                              onChange={(e) => {
                                const updated = [...logData.defects];
                                updated[idx].defectQty = e.target.value;
                                setLogData({ ...logData, defects: updated });
                              }}
                              className="w-16 p-1.5 border border-slate-300 rounded bg-white text-xs text-right"
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveDefectRow(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Location (e.g. Meter 30-40, Edge)"
                              value={d.location}
                              onChange={(e) => {
                                const updated = [...logData.defects];
                                updated[idx].location = e.target.value;
                                setLogData({ ...logData, defects: updated });
                              }}
                              className="flex-1 p-1.5 border border-slate-300 rounded bg-white text-[11px]"
                            />
                            <input
                              type="text"
                              placeholder="Notes"
                              value={d.notes}
                              onChange={(e) => {
                                const updated = [...logData.defects];
                                updated[idx].notes = e.target.value;
                                setLogData({ ...logData, defects: updated });
                              }}
                              className="flex-1 p-1.5 border border-slate-300 rounded bg-white text-[11px]"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Inspection Notes</label>
                  <textarea
                    rows="2"
                    value={logData.notes}
                    onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
                    placeholder="Weave density, GSM verification, shade band rating..."
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
              </form>
            </div>

            <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsLogOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="log-inspection-form"
                disabled={logLoading}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                {logLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Inspection Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RE-INSPECT MODAL */}
      {isReinspectOpen && selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md shadow-2xl text-xs space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Re-inspect Roll: {selectedInspection.rollNumber}
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Roll was on REWORK hold. Re-examine after washing or corrective re-dyeing.
                </p>
              </div>
              <button onClick={() => setIsReinspectOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReinspect} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Verdict Status *</label>
                <select
                  value={reinspectStatus}
                  onChange={(e) => setReinspectStatus(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold"
                >
                  <option value="PASSED">PASS (Release for Dispatch)</option>
                  <option value="REJECTED">FAIL (Permanent Scrap/Reject)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Re-inspection Notes</label>
                <textarea
                  rows="3"
                  required
                  value={reinspectNotes}
                  onChange={(e) => setReinspectNotes(e.target.value)}
                  placeholder="Detail corrective action: e.g. Re-washed shade discrepancy, passed 95% tolerance threshold."
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReinspectOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reinspectLoading}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  {reinspectLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Re-inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
