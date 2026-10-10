import React from 'react';
import {
  Package,
  ShoppingBag,
  Truck,
  Cpu,
  CheckSquare,
  Users,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Receipt,
  PieChart
} from 'lucide-react';

export function ModuleGrid({ setActiveTab, summary, dbConnected }) {
  const modules = [
    {
      id: 'buyers',
      title: 'Buyer Management',
      subtitle: 'Directory, Buyer Orders & Live Stages',
      status: 'Available',
      icon: Users,
      description: 'Manage buyer directory, track derived live factory stages, and inspect order manufacturing costing.',
      tab: 'buyers',
      stats: summary?.supplyChain ? `${summary.supplyChain.totalSalesOrders} Orders` : 'Buyer Contracts'
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      subtitle: 'Raw Yarn, Finished Goods & Reorder Levels',
      status: 'Available',
      icon: Package,
      description: 'Track yarn cones, fabric rolls, and reorder levels. Stocks automatically increase upon purchase receiving.',
      tab: 'inventory',
      stats: summary?.supplyChain ? `${summary.supplyChain.totalProducts} Items` : 'Catalog Tracking'
    },
    {
      id: 'purchase',
      title: 'Purchase Management',
      subtitle: 'Supplier Procurement & Goods Receipt',
      status: 'Available',
      icon: ShoppingBag,
      description: 'Procure raw materials from spinning mills and confirm inward deliveries to update stock.',
      tab: 'purchase',
      stats: 'Inward POs'
    },
    {
      id: 'dispatch',
      title: 'Dispatch & Logistics',
      subtitle: 'Gate Pass & Stock Deduction',
      status: 'Available',
      icon: Truck,
      description: 'Verify finished goods, dispatch delivery trucks, and deduct warehouse stock atomically.',
      tab: 'dispatch',
      stats: 'Gate Pass Shipping'
    },
    {
      id: 'manufacturing',
      title: 'Manufacturing Execution',
      subtitle: 'Spinning, Weaving & Dyeing Floors',
      status: 'Available',
      icon: Cpu,
      description: 'Floor machine scheduling, 4-stage transitions, scrap logs, and material consumption.',
      tab: 'manufacturing',
      stats: summary?.factoryOperations ? `${summary.factoryOperations.activeProductionOrders} Active Jobs` : 'Floor Jobs'
    },
    {
      id: 'quality',
      title: 'Quality Control',
      subtitle: 'Fabric Roll Inspection & Clearance',
      status: 'Available',
      icon: CheckSquare,
      description: 'Defect logging (holes, color mismatch) and live gate-pass clearance enforcement.',
      tab: 'quality',
      stats: summary?.factoryOperations ? `${summary.factoryOperations.qcPassRate} QC Pass Rate` : 'Inspections'
    },
    {
      id: 'hr',
      title: 'HR & Attendance',
      subtitle: 'Shift Registers & Wage Calculations',
      status: 'Available',
      icon: Users,
      description: 'Daily shift attendance tracking (Morning, Evening, Night) with wage calculations.',
      tab: 'hr',
      stats: summary?.factoryOperations ? `${summary.factoryOperations.activeWorkers} Workers` : 'Shift Registers'
    },
    {
      id: 'transactions',
      title: 'Transactions',
      subtitle: 'Central Financial Audit Ledger',
      status: 'Available',
      icon: Receipt,
      description: 'Centralized money flow: sales invoices, buyer receipts, supplier bills & settlements, and wages.',
      tab: 'transactions',
      stats: 'Financial Events'
    },
    {
      id: 'finance',
      title: 'Owner Financial Closing',
      subtitle: 'Accrual P&L, Cash Flow & Working Capital',
      status: 'Available',
      icon: PieChart,
      description: 'Executive month-end health: Invoiced revenues vs material & labor costs, cash liquidity, and margins.',
      tab: 'finance',
      stats: 'Executive Closing'
    },
    {
      id: 'dashboard',
      title: 'Dashboard & Analytics',
      subtitle: 'Operations & Inventory Overview',
      status: 'Available',
      icon: BarChart3,
      description: 'Centralized operational overview across supply chain, production, and warehouse stock.',
      tab: 'dashboard',
      stats: 'Executive KPIs'
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner - Warm Purple Theme */}
      <div className="bg-gradient-to-r from-[#503568] via-[#674191] to-[#7950A8] rounded-2xl p-8 sm:p-10 shadow-lg text-white relative overflow-hidden border border-[#503568]">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-xs border border-white/20">
            <ShieldCheck className="w-4 h-4 text-[#EEE5F7]" />
            <span>Central Textile ERP Platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Textile Mills Operations
          </h1>

          <p className="text-base sm:text-lg text-[#EEE5F7] leading-relaxed">
            Replacing notebooks and phone calls with one unified digital backbone.
          </p>
        </div>

        {/* Decorative soft overlay */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/5 pointer-events-none blur-2xl" />
      </div>

      {/* Grid of 8 Functional Modules */}
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#292235]">Operations & Supply Chain Modules</h2>
          <p className="text-sm sm:text-base text-[#766D82] mt-1">Select a module to view records and manage operations.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {modules.map((m) => {
            const Icon = m.icon;

            return (
              <div
                key={m.id}
                onClick={() => setActiveTab(m.tab)}
                className="group bg-white rounded-2xl border border-[#E8DFEF] shadow-2xs hover:shadow-md hover:border-[#7950A8] transition-all p-6 flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-[#EEE5F7] text-[#503568] group-hover:bg-[#7950A8] group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {m.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-[#292235] group-hover:text-[#7950A8] transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs font-medium text-[#766D82] mt-0.5">{m.subtitle}</p>
                  </div>

                  <p className="text-sm text-[#766D82] leading-relaxed">
                    {m.description}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#F3EEF8] flex items-center justify-between text-sm">
                  <span className="text-xs font-semibold text-[#503568] bg-[#FAF7FC] px-2.5 py-1 rounded-lg border border-[#E8DFEF]">
                    {m.stats}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#FAF7FC] group-hover:bg-[#EEE5F7] group-hover:text-[#7950A8] flex items-center justify-center text-[#766D82] transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
