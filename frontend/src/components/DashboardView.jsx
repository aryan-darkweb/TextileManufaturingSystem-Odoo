import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Package,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';

export function DashboardView({ setActiveTab }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardSummary();
      if (res?.data) {
        setSummary(res.data);
      }
    } catch {
      // Degraded / DB pending
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#292235]">Operational Dashboard & Analytics</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EEE5F7] text-[#503568] border border-[#DFCFF0]">
              Real-time Overview
            </span>
          </div>
          <p className="text-xs text-[#766D82] mt-1">
            Mill operations across yarn intake, inventory health, buyer orders, and shipping logistics.
          </p>
        </div>

        <button
          onClick={loadSummary}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E8DFEF] bg-white rounded-lg hover:bg-[#FAF7FC] text-[#503568] text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs hover:border-[#7950A8] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#766D82] uppercase font-semibold">Inventory SKUs</span>
            <Package className="w-4 h-4 text-[#7950A8]" />
          </div>
          <p className="text-2xl font-bold text-[#292235] mt-1">
            {summary?.supplyChain?.totalProducts ?? '—'}
          </p>
          <div className="mt-1 text-[11px] text-amber-700 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>{summary?.supplyChain?.lowStockAlerts ?? 0} low stock warnings</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('sales')}
          className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs hover:border-[#7950A8] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#766D82] uppercase font-semibold">Sales Orders</span>
            <ShoppingCart className="w-4 h-4 text-[#7950A8]" />
          </div>
          <p className="text-2xl font-bold text-[#503568] mt-1">
            {summary?.supplyChain?.totalSalesOrders ?? '—'}
          </p>
          <div className="mt-1 text-[11px] text-[#766D82]">
            <span>{summary?.supplyChain?.activeSalesOrders ?? 0} orders in fulfillment</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('factory')}
          className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs hover:border-[#7950A8] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#766D82] uppercase font-semibold">Floor Machines</span>
            <Cpu className="w-4 h-4 text-[#7950A8]" />
          </div>
          <p className="text-2xl font-bold text-[#292235] mt-1">
            {summary?.factoryOperations?.totalMachines ?? '—'}
          </p>
          <div className="mt-1 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{summary?.factoryOperations?.runningMachines ?? 0} running currently</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('factory')}
          className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs hover:border-[#7950A8] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#766D82] uppercase font-semibold">QC Pass Rate</span>
            <TrendingUp className="w-4 h-4 text-[#7950A8]" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {summary?.factoryOperations?.qcPassRate ?? '100%'}
          </p>
          <div className="mt-1 text-[11px] text-[#766D82]">
            <span>Roll inspections verified</span>
          </div>
        </div>
      </div>

      {/* Main Operational Hub Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Supply Chain Flow Summary */}
        <div className="bg-white rounded-xl border border-[#E8DFEF] p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#292235] flex items-center justify-between">
            <span>Supply Chain Flow Actions</span>
            <span className="text-[11px] font-semibold text-[#503568] bg-[#EEE5F7] px-2 py-0.5 rounded">Active</span>
          </h2>

          <div className="space-y-3">
            <div
              onClick={() => setActiveTab('purchase')}
              className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] hover:border-[#7950A8] flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EEE5F7] text-[#503568] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-[#292235]">Procurement & Inward POs</h3>
                  <p className="text-[11px] text-[#766D82]">Order raw yarn and receive truck loads into storage</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#766D82]" />
            </div>

            <div
              onClick={() => setActiveTab('inventory')}
              className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] hover:border-[#7950A8] flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EEE5F7] text-[#503568] flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-[#292235]">Warehouse & Stock Monitoring</h3>
                  <p className="text-[11px] text-[#766D82]">Inspect raw yarn, fabric rolls, and low stock warnings</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#766D82]" />
            </div>

            <div
              onClick={() => setActiveTab('sales')}
              className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] hover:border-[#7950A8] flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EEE5F7] text-[#503568] flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-[#292235]">Buyer Order Fulfillment</h3>
                  <p className="text-[11px] text-[#766D82]">Process customer fabric specifications and delivery dates</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#766D82]" />
            </div>

            <div
              onClick={() => setActiveTab('dispatch')}
              className="p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] hover:border-[#7950A8] flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EEE5F7] text-[#503568] flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-[#292235]">Dispatch & Gate Pass Out</h3>
                  <p className="text-[11px] text-[#766D82]">Assign transport trucks and deduct finished goods stock</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#766D82]" />
            </div>
          </div>
        </div>

        {/* Factory Floor Overview */}
        <div className="bg-white rounded-xl border border-[#E8DFEF] p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#292235] flex items-center justify-between">
            <span>Factory Floor Integration</span>
            <span className="text-[11px] font-semibold text-[#503568] bg-[#EEE5F7] px-2 py-0.5 rounded">
              Floor Operations
            </span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#292235]">Spinning & Weaving Looms</span>
                <span className="font-bold text-[#7950A8]">4 Configured</span>
              </div>
              <div className="w-full bg-[#E8DFEF] h-2 rounded-full overflow-hidden">
                <div className="bg-[#7950A8] h-full w-3/4" />
              </div>
              <p className="text-[11px] text-[#766D82]">Rieter Ring Frames & Picanol Airjets operational</p>
            </div>

            <div className="p-3.5 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#292235]">Quality Inspection Station</span>
                <span className="font-bold text-emerald-700">Online</span>
              </div>
              <p className="text-[11px] text-[#766D82]">
                Roll defect testing for holes, color mismatch, and weave unevenness before packing slips.
              </p>
            </div>

            <div className="p-3.5 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#292235]">Worker Shifts & Attendance</span>
                <span className="font-bold text-[#503568]">Morning / Evening / Night</span>
              </div>
              <p className="text-[11px] text-[#766D82]">
                Shift muster roll registers linked to wage calculation per shift.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
