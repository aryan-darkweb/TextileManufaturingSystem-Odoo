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
  TrendingUp
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header - Prominent and Clean */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DFEF]">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#292235] tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-sm sm:text-base text-[#766D82] mt-1.5">
            Operational overview across procurement, inventory health, buyer orders, and shipping logistics.
          </p>
        </div>

        <button
          onClick={loadSummary}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 border border-[#E8DFEF] bg-white rounded-xl hover:bg-[#FAF7FC] text-[#503568] text-sm font-semibold transition cursor-pointer min-h-[44px]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards Row - Spacious & Legible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs hover:border-[#7950A8] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Inventory SKUs</span>
            <Package className="w-5 h-5 text-[#7950A8]" />
          </div>
          <p className="text-3xl font-extrabold text-[#292235] mt-2">
            {summary?.supplyChain?.totalProducts ?? '—'}
          </p>
          <div className="mt-1.5 text-xs text-amber-700 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{summary?.supplyChain?.lowStockAlerts ?? 0} low stock warnings</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('sales')}
          className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs hover:border-[#7950A8] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Sales Orders</span>
            <ShoppingCart className="w-5 h-5 text-[#7950A8]" />
          </div>
          <p className="text-3xl font-extrabold text-[#503568] mt-2">
            {summary?.supplyChain?.totalSalesOrders ?? '—'}
          </p>
          <div className="mt-1.5 text-xs text-[#766D82]">
            <span>{summary?.supplyChain?.activeSalesOrders ?? 0} orders in fulfillment</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('factory')}
          className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs hover:border-[#7950A8] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Floor Machines</span>
            <Cpu className="w-5 h-5 text-[#7950A8]" />
          </div>
          <p className="text-3xl font-extrabold text-[#292235] mt-2">
            {summary?.factoryOperations?.totalMachines ?? '—'}
          </p>
          <div className="mt-1.5 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{summary?.factoryOperations?.runningMachines ?? 0} running currently</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('factory')}
          className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs hover:border-[#7950A8] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">QC Pass Rate</span>
            <TrendingUp className="w-5 h-5 text-[#7950A8]" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2">
            {summary?.factoryOperations?.qcPassRate ?? '100%'}
          </p>
          <div className="mt-1.5 text-xs text-[#766D82]">
            <span>Roll clearance enforced</span>
          </div>
        </div>
      </div>

      {/* Main Operational Hub Overview - Simplified Boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supply Chain Flow Summary */}
        <div className="bg-white rounded-2xl border border-[#E8DFEF] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#292235]">Supply Chain Modules</h2>
            <span className="text-xs font-semibold text-[#503568] bg-[#EEE5F7] px-2.5 py-1 rounded-full">Active</span>
          </div>

          <div className="space-y-3">
            <div
              onClick={() => setActiveTab('purchase')}
              className="p-4 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] hover:border-[#7950A8] flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EEE5F7] text-[#503568] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#292235]">Procurement & Inward POs</h3>
                  <p className="text-xs text-[#766D82]">Order raw yarn and receive inward shipments into stock</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#766D82]" />
            </div>

            <div
              onClick={() => setActiveTab('inventory')}
              className="p-4 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] hover:border-[#7950A8] flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EEE5F7] text-[#503568] flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#292235]">Warehouse Stock Monitoring</h3>
                  <p className="text-xs text-[#766D82]">Inspect raw yarn, fabric rolls, and reorder warnings</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#766D82]" />
            </div>

            <div
              onClick={() => setActiveTab('sales')}
              className="p-4 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] hover:border-[#7950A8] flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EEE5F7] text-[#503568] flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#292235]">Buyer Order Fulfillment</h3>
                  <p className="text-xs text-[#766D82]">Process customer fabric orders and delivery dates</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#766D82]" />
            </div>

            <div
              onClick={() => setActiveTab('dispatch')}
              className="p-4 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] hover:border-[#7950A8] flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EEE5F7] text-[#503568] flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#292235]">Dispatch & Gate Pass Out</h3>
                  <p className="text-xs text-[#766D82]">Assign transport trucks and deduct finished goods stock</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#766D82]" />
            </div>
          </div>
        </div>

        {/* Factory Floor Overview */}
        <div className="bg-white rounded-2xl border border-[#E8DFEF] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#292235]">Factory Floor Summary</h2>
            <span className="text-xs font-semibold text-[#503568] bg-[#EEE5F7] px-2.5 py-1 rounded-full">
              Operations
            </span>
          </div>

          <div className="space-y-3.5">
            <div className="p-4 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold text-[#292235]">
                <span>Spinning & Weaving Looms</span>
                <span className="font-bold text-[#7950A8]">4 Configured</span>
              </div>
              <div className="w-full bg-[#E8DFEF] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#7950A8] h-full w-3/4" />
              </div>
              <p className="text-xs text-[#766D82]">Rieter Ring Frames & Picanol Airjets operational</p>
            </div>

            <div className="p-4 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-1.5">
              <div className="flex justify-between items-center text-sm font-semibold text-[#292235]">
                <span>Quality Inspection Gate</span>
                <span className="font-bold text-emerald-700">Live Guard Enforced</span>
              </div>
              <p className="text-xs text-[#766D82]">
                Roll defect testing for holes, color mismatch, and weave unevenness before dispatch passes.
              </p>
            </div>

            <div className="p-4 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] space-y-1.5">
              <div className="flex justify-between items-center text-sm font-semibold text-[#292235]">
                <span>Worker Shift Mustering</span>
                <span className="font-bold text-[#503568]">Morning / Evening / Night</span>
              </div>
              <p className="text-xs text-[#766D82]">
                Muster roll registers linked to wage calculation per shift.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
