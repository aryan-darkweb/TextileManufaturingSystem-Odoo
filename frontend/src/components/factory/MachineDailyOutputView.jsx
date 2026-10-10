import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Calendar,
  Filter,
  RefreshCw,
  Layers,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Gauge
} from 'lucide-react';
import { api } from '../../services/api';

const STAGES = ['SPINNING', 'WEAVING', 'DYEING', 'FINISHING'];

export function MachineDailyOutputView({ dbConnected }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [machinesList, setMachinesList] = useState([]);

  // Filters
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedStage, setSelectedStage] = useState('');

  const fetchOutputReport = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = {};
      if (selectedDate) params.date = selectedDate;
      if (selectedMachine) params.machineId = selectedMachine;
      if (selectedStage) params.stage = selectedStage;

      const [outputRes, machinesRes] = await Promise.allSettled([
        api.getMachineDailyOutput(params),
        api.getMachines(),
      ]);

      if (outputRes.status === 'fulfilled' && outputRes.value?.data) {
        setData(outputRes.value.data);
      } else if (outputRes.status === 'rejected') {
        throw outputRes.reason;
      }

      if (machinesRes.status === 'fulfilled' && machinesRes.value?.data) {
        setMachinesList(machinesRes.value.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load machine output data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutputReport();
  }, [selectedDate, selectedMachine, selectedStage]);

  // Quick Date Presets
  const handlePresetDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const summary = data?.summary || {
    totalRuns: 0,
    totalOutputByUnit: {},
    totalWasteByUnit: {},
    stageBreakdown: {},
    activeMachinesCount: 0,
    totalMachinesCount: 0,
  };

  const records = data?.records || [];
  const machineOverview = data?.machineOverview || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Machine Daily Output
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 uppercase tracking-wider">
                Phase 3 Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Actual production logs aggregated by machine, stage, and shift. Segregated units prevent double-counting across spinning and weaving lines.
            </p>
          </div>

          <button
            onClick={fetchOutputReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition-colors self-start md:self-auto shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-violet-600" />
            <span className="font-semibold text-slate-600">Production Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-mono text-slate-900 font-bold focus:outline-hidden"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => handlePresetDate(0)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handlePresetDate(1)}
              className="px-2.5 py-1 rounded-lg font-semibold text-slate-600 hover:text-slate-900"
            >
              Yesterday
            </button>
            <button
              onClick={() => handlePresetDate(7)}
              className="px-2.5 py-1 rounded-lg font-semibold text-slate-600 hover:text-slate-900"
            >
              7 Days Ago
            </button>
          </div>

          {/* Machine Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-hidden"
            >
              <option value="">All Factory Machines</option>
              {machinesList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name} ({m.type})
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-hidden"
            >
              <option value="">All Process Stages</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {(selectedMachine || selectedStage) && (
            <button
              onClick={() => {
                setSelectedMachine('');
                setSelectedStage('');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Message with Retry */}
      {errorMsg && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 flex items-center justify-between text-sm shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              <strong>Failed to load machine output:</strong> {errorMsg}
            </span>
          </div>
          <button
            onClick={fetchOutputReport}
            className="px-3 py-1 bg-white border border-rose-300 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Production Output */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Output by Unit
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            {Object.keys(summary.totalOutputByUnit).length === 0 ? (
              <div className="text-2xl font-black text-slate-400">0.00</div>
            ) : (
              Object.entries(summary.totalOutputByUnit).map(([unit, qty]) => (
                <div key={unit} className="text-xl font-black text-slate-900">
                  {qty.toLocaleString()} <span className="text-xs font-semibold text-violet-700">{unit}</span>
                </div>
              ))
            )}
          </div>
          <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            Segregated output (Spinning KG / Weaving MTR)
          </p>
        </div>

        {/* KPI 2: Completed Stage Runs */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Runs
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.totalRuns}
            <span className="text-xs font-normal text-slate-400 ml-1.5">stage jobs</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            From verified stage completion logs
          </p>
        </div>

        {/* KPI 3: Machines Reporting */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Reporting Machines
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.activeMachinesCount}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              / {summary.totalMachinesCount} with output
            </span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            {summary.totalMachinesCount - summary.activeMachinesCount} machines idle/no production today
          </p>
        </div>

        {/* KPI 4: Waste Recorded */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recorded Waste
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            {Object.keys(summary.totalWasteByUnit).length === 0 ? (
              <div className="text-2xl font-black text-slate-400">0.00</div>
            ) : (
              Object.entries(summary.totalWasteByUnit).map(([unit, qty]) => (
                <div key={unit} className="text-xl font-black text-amber-700">
                  {qty.toLocaleString()} <span className="text-xs font-semibold text-amber-900">{unit}</span>
                </div>
              ))
            )}
          </div>
          <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            Pneumafil, warp shedding, or trimming
          </p>
        </div>
      </div>

      {/* Machine Operational Status Overview (Strict distinction between status and output) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-600" />
              Machine Floor Status & Daily Output ({selectedDate})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distinguishes machine operational status (Running/Idle/Maintenance) from actual logged production volume.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {machineOverview.length} Machines Registered
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {machineOverview.map((m) => (
            <div
              key={m.machineId}
              className={`p-4 rounded-2xl border transition-all ${
                m.hasProduction
                  ? 'border-violet-200 bg-violet-50/40 shadow-2xs'
                  : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900">{m.code}</span>
                  <div className="text-[11px] text-slate-500 truncate max-w-[120px]" title={m.name}>
                    {m.name}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    m.status === 'RUNNING'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : m.status === 'MAINTENANCE'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : m.status === 'BREAKDOWN'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {m.status}
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">Recorded Output:</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span
                    className={`text-lg font-black font-mono ${
                      m.hasProduction ? 'text-violet-950' : 'text-slate-400'
                    }`}
                  >
                    {m.recordedOutput.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{m.unit}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Runs: {m.recordedRuns}</span>
                  <span className="text-slate-400">{m.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Output Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Aggregated Production Records
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Production orders, output quantities, waste, and capacity utilization by machine.
            </p>
          </div>
          <span className="text-xs font-bold text-violet-700 bg-violet-100 px-3 py-1 rounded-full self-start sm:self-auto border border-violet-200">
            {records.length} Aggregated Record{records.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-violet-600" />
            <p className="text-xs font-semibold">Aggregating machine logs from database...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No Production Output Found</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No completed production stage logs were recorded for the selected date ({selectedDate})
              {selectedMachine ? ' and machine filter' : ''}. Machine statuses remain active above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Output Qty</th>
                  <th className="py-3 px-4 text-right">Waste</th>
                  <th className="py-3 px-4 text-center">Runs</th>
                  <th className="py-3 px-4">Shift Utilization</th>
                  <th className="py-3 px-4">Linked Production Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 font-mono">{r.machineCode}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{r.machineName}</div>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${
                          r.machineStatus === 'RUNNING'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {r.machineStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                        {r.stage}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                      {r.date}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-sm font-black text-slate-900">
                        {r.totalOutputQuantity.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1 font-semibold">{r.unit}</span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-semibold text-rose-600">
                        {r.totalWasteQuantity.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">{r.unit}</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold font-mono">
                        {r.runCount}
                      </span>
                    </td>

                    <td className="py-3 px-4 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-700 mb-1">
                        <span>{r.utilizationPercent}%</span>
                        <span className="text-[10px] text-slate-400 font-normal">Cap: {r.capacityPerShift} {r.unit}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            r.utilizationPercent > 100
                              ? 'bg-amber-500'
                              : r.utilizationPercent >= 75
                              ? 'bg-emerald-500'
                              : 'bg-violet-500'
                          }`}
                          style={{ width: `${Math.min(r.utilizationPercent, 100)}%` }}
                        ></div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {r.productionOrders.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          r.productionOrders.map((poNum) => (
                            <span
                              key={poNum}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold"
                            >
                              {poNum}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
