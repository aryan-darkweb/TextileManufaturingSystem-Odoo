import React from 'react';
import {
  Package,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Cpu,
  CheckSquare,
  Users,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export function ModuleGrid({ setActiveTab, summary, dbConnected }) {
  const modules = [
    {
      id: 'inventory',
      title: 'Inventory Management',
      subtitle: 'Raw Yarn, Finished Goods, Stock Warnings',
      status: 'Available',
      statusType: 'active',
      icon: Package,
      description: 'Track yarn inventory at the gate, fabric rolls on shelves, and get automatic low-stock warnings before running out.',
      tab: 'inventory',
      stats: summary?.supplyChain ? `${summary.supplyChain.totalProducts} Items Tracked` : 'Yarn & Rolls Tracking'
    },
    {
      id: 'sales',
      title: 'Sales Orders',
      subtitle: 'Buyer Orders, Specs & Deadlines',
      status: 'Available',
      statusType: 'active',
      icon: ShoppingCart,
      description: 'Receive orders from multiple buyers with fabric type, color, quantity, and track fulfillment status accurately.',
      tab: 'sales',
      stats: summary?.supplyChain ? `${summary.supplyChain.totalSalesOrders} Orders Logged` : 'Buyer Order Flow'
    },
    {
      id: 'purchase',
      title: 'Purchase Management',
      subtitle: 'Supplier Yarn Procurement & Goods Inward',
      status: 'Available',
      statusType: 'active',
      icon: ShoppingBag,
      description: 'Procure raw materials from suppliers, track arrival dates, and receive goods to update warehouse stock automatically.',
      tab: 'purchase',
      stats: 'Yarn Intake & Inward POs'
    },
    {
      id: 'dispatch',
      title: 'Dispatch & Logistics',
      subtitle: 'Gate-Out, Vehicle Records & Stock Deduction',
      status: 'Available',
      statusType: 'active',
      icon: Truck,
      description: 'Pack, count, and dispatch finished fabric rolls to buyers with vehicle numbers, invoice matching, and live stock deduction.',
      tab: 'dispatch',
      stats: 'Gate Pass & Shipping'
    },
    {
      id: 'manufacturing',
      title: 'Manufacturing Execution',
      subtitle: 'Spinning, Weaving & Dyeing Floors',
      status: 'Available',
      statusType: 'active',
      icon: Cpu,
      description: 'Floor machines (Ring frames, Airjets, Dyeing jiggers), production order stages, shift capacity, and material consumption tracking.',
      tab: 'manufacturing',
      stats: summary?.factoryOperations ? `${summary.factoryOperations.activeProductionOrders} Active Floor Jobs` : 'Machines & Floor Jobs'
    },
    {
      id: 'quality',
      title: 'Quality Control',
      subtitle: 'Fabric Roll Defect Inspections & Gate Pass',
      status: 'Available',
      statusType: 'active',
      icon: CheckSquare,
      description: 'Inspect fabric rolls for holes, color mismatches, and weaving flaws. Live gate pass validation: only passed rolls can be dispatched.',
      tab: 'quality',
      stats: summary?.factoryOperations ? `${summary.factoryOperations.qcPassRate} QC Pass Rate` : 'Inspection Slips & Defect Tracking'
    },
    {
      id: 'hr',
      title: 'HR & Worker Attendance',
      subtitle: 'Shift Registers & Wage Payroll',
      status: 'Available',
      statusType: 'active',
      icon: Users,
      description: 'Track factory mill workers across Morning, Evening, and Night shifts with live wage calculation per shift for accurate payroll.',
      tab: 'hr',
      stats: summary?.factoryOperations ? `${summary.factoryOperations.activeWorkers} Workers Active` : 'Shift Registers & Wages'
    },
    {
      id: 'dashboard',
      title: 'Dashboard & Analytics',
      subtitle: 'Unified Operational & Cost Metrics',
      status: 'Available',
      statusType: 'active',
      icon: BarChart3,
      description: 'Bring raw material intake, sales orders, warehouse levels, and mill output together into one executive overview.',
      tab: 'dashboard',
      stats: 'Cross-Module KPIs'
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Redesigned Hero Banner - Warm Purple Theme */}
      <div className="bg-gradient-to-r from-[#503568] via-[#674191] to-[#7950A8] rounded-2xl p-7 sm:p-9 shadow-lg text-white relative overflow-hidden border border-[#503568]">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/15 text-white backdrop-blur-xs border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-[#EEE5F7]" />
            <span>Central Operations</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Textile Mills — TextileFlow Platform
          </h1>

          <p className="text-sm sm:text-base text-[#EEE5F7] leading-relaxed">
            Replacing notebooks and phone calls with one unified digital backbone.
          </p>

          <div className="pt-2">
            <span className="inline-block bg-[#3D2850]/40 text-[#EEE5F7] text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10">
              All running inside ONE monolithic server — no microservices
            </span>
          </div>
        </div>

        {/* Decorative soft overlay */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/5 pointer-events-none blur-2xl" />
      </div>

      {/* Grid of 8 Functional Modules */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#292235]">Operations & Supply Chain Modules</h2>
            <p className="text-xs text-[#766D82]">Select a module to view records and manage workflows</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {modules.map((m) => {
            const Icon = m.icon;
            const isAvailable = m.status === 'Available';

            return (
              <div
                key={m.id}
                onClick={() => setActiveTab(m.tab)}
                className="group bg-white rounded-xl border border-[#E8DFEF] shadow-2xs hover:shadow-md hover:border-[#7950A8] transition-all p-5 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#EEE5F7] text-[#503568] group-hover:bg-[#7950A8] group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-[#EEE5F7] text-[#503568] border-[#DFCFF0]'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-[#292235] group-hover:text-[#7950A8] transition-colors text-sm">
                    {m.title}
                  </h3>
                  <p className="text-[11px] font-medium text-[#766D82] mt-0.5">{m.subtitle}</p>

                  <p className="text-xs text-[#766D82] mt-2.5 line-clamp-3 leading-relaxed">
                    {m.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F3EEF8] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium text-[#503568] bg-[#FAF7FC] px-2 py-0.5 rounded border border-[#E8DFEF]">
                    {m.stats}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-[#FAF7FC] group-hover:bg-[#EEE5F7] group-hover:text-[#7950A8] flex items-center justify-center text-[#766D82] transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
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
