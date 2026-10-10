import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Cpu,
  CheckSquare,
  Users,
  Clock,
  Package,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

export function FactoryTodayView({ onSwitchTab, dbConnected }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getFactoryToday();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load Factory Today summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const stageCounts = data?.stageCounts || {
    SPINNING: 0,
    WEAVING: 0,
    DYEING: 0,
    FINISHING: 0,
    COMPLETED: 0
  };

  const machineStatus = data?.machineStatus || {
    RUNNING: 0,
    IDLE: 0,
    MAINTENANCE: 0,
    BREAKDOWN: 0
  };

  const qualityAlerts = data?.qualityAlerts || {
    totalAlertRolls: 0,
    reworkRolls: 0,
    rejectedRolls: 0
  };

  const attendanceToday = data?.attendanceToday || {
    present: 0,
    halfDay: 0,
    absent: 0,
    leave: 0
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Factory Today Overview</h2>
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Floor Metrics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status across production lines, QC holds, active workforce, and mill machines.
          </p>
        </div>

        <button
          onClick={fetchSummary}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong>Error loading data:</strong> {errorMsg}
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Production Stages */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Floor Jobs</span>
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stageCounts.SPINNING + stageCounts.WEAVING + stageCounts.DYEING + stageCounts.FINISHING}
            <span className="text-xs font-normal text-slate-400 ml-1.5">orders active</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-slate-100">
            <div className="text-slate-600">Spinning: <strong>{stageCounts.SPINNING}</strong></div>
            <div className="text-slate-600">Weaving: <strong>{stageCounts.WEAVING}</strong></div>
            <div className="text-slate-600">Dyeing: <strong>{stageCounts.DYEING}</strong></div>
            <div className="text-slate-600">Finishing: <strong>{stageCounts.FINISHING}</strong></div>
          </div>
        </div>

        {/* KPI 2: Quality Holds */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">QC Holds & Blocks</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${qualityAlerts.totalAlertRolls > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {qualityAlerts.totalAlertRolls}
            <span className="text-xs font-normal text-slate-400 ml-1.5">rolls blocked</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Rework: {qualityAlerts.reworkRolls}
            </span>
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Rejected: {qualityAlerts.rejectedRolls}
            </span>
          </div>
        </div>

        {/* KPI 3: Machines Running */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Floor Machines</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {machineStatus.RUNNING}
            <span className="text-xs font-normal text-slate-400 ml-1.5">/ {machineStatus.RUNNING + machineStatus.IDLE + machineStatus.MAINTENANCE + machineStatus.BREAKDOWN} running</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-slate-600">Idle: <strong>{machineStatus.IDLE}</strong></span>
            {machineStatus.BREAKDOWN > 0 && (
              <span className="text-rose-600 font-semibold">Breakdown: {machineStatus.BREAKDOWN}</span>
            )}
            <span className="text-slate-600">Maint: <strong>{machineStatus.MAINTENANCE}</strong></span>
          </div>
        </div>

        {/* KPI 4: Today Attendance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workers on Shift</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {attendanceToday.present + attendanceToday.halfDay}
            <span className="text-xs font-normal text-slate-400 ml-1.5">present today</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-emerald-700">Full: <strong>{attendanceToday.present}</strong></span>
            <span className="text-amber-700">Half: <strong>{attendanceToday.halfDay}</strong></span>
            <span className="text-slate-500">Absent: <strong>{attendanceToday.absent}</strong></span>
            <span className="text-sky-700">Leave: <strong>{attendanceToday.leave}</strong></span>
          </div>
        </div>
      </div>

      {/* Warnings & Floor Alerts Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              Raw Material Stock Alerts
            </h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${data?.lowStockCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
              {data?.lowStockCount || 0} Low Stock
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {data?.lowStockCount > 0
              ? `There are ${data.lowStockCount} inventory items at or below minimum safety stock threshold. Verify spinning yarn and dyeing chemicals before starting new stages.`
              : 'All raw yarn and dyeing consumables are above minimum warehouse threshold.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Overdue Sales Orders
            </h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${data?.overdueSalesOrdersCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
              {data?.overdueSalesOrdersCount || 0} Past Deadline
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {data?.overdueSalesOrdersCount > 0
              ? `${data.overdueSalesOrdersCount} buyer orders have exceeded their delivery deadline without reaching DISPATCHED/COMPLETED status.`
              : 'All buyer orders in production are within their scheduled delivery deadlines.'}
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onSwitchTab('production')}
          className="group bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-violet-950 text-sm group-hover:text-violet-700 transition-colors">
              Manage Production Orders
            </h4>
            <p className="text-xs text-violet-700 mt-1">Spinning, weaving & dyeing execution</p>
          </div>
          <ArrowRight className="w-5 h-5 text-violet-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
        </div>

        <div
          onClick={() => onSwitchTab('quality')}
          className="group bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-pink-950 text-sm group-hover:text-pink-700 transition-colors">
              Quality Roll Inspections
            </h4>
            <p className="text-xs text-pink-700 mt-1">Defects, re-inspections & dispatch checks</p>
          </div>
          <ArrowRight className="w-5 h-5 text-pink-400 group-hover:text-pink-600 group-hover:translate-x-1 transition-all" />
        </div>

        <div
          onClick={() => onSwitchTab('hr')}
          className="group bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sky-950 text-sm group-hover:text-sky-700 transition-colors">
              Shift Attendance Register
            </h4>
            <p className="text-xs text-sky-700 mt-1">Mill workers, shifts & wage tracking</p>
          </div>
          <ArrowRight className="w-5 h-5 text-sky-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
}
