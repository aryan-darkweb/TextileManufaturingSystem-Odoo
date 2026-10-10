import React from 'react';
import {
  Package,
  ShoppingCart,
  Truck,
  Cpu,
  CheckSquare,
  Users,
  BarChart3,
  FileText,
  ArrowRight,
  UserCheck,
  Building2,
  AlertCircle
} from 'lucide-react';

export function ModuleGrid({ setActiveTab, summary, dbConnected }) {
  const modules = [
    {
      id: 'inventory',
      title: 'Inventory Management',
      subtitle: 'Raw Yarn, Finished Goods, Stock Warnings',
      owner: 'Kishan (Supply Chain)',
      status: 'ACTIVE_WORKING',
      icon: Package,
      gradient: 'from-blue-600 to-cyan-500',
      badge: 'Live Initial Workflow',
      stats: summary?.supplyChain ? `${summary.supplyChain.totalProducts} Products Registered` : 'Yarn & Rolls Tracking',
      description: 'Track yarn inventory at the gate, fabric rolls on shelves, and get automatic low-stock warnings before running out.',
      tab: 'inventory'
    },
    {
      id: 'sales',
      title: 'Sales Orders',
      subtitle: 'Buyer Orders, Specs & Deadlines',
      owner: 'Kishan (Supply Chain)',
      status: 'ACTIVE_WORKING',
      icon: ShoppingCart,
      gradient: 'from-emerald-600 to-teal-500',
      badge: 'Live Initial Workflow',
      stats: summary?.supplyChain ? `${summary.supplyChain.totalSalesOrders} Sales Orders` : 'Buyer Order Flow',
      description: 'Receive orders from multiple buyers with fabric type, color, quantity, and track fulfillment status accurately.',
      tab: 'sales'
    },
    {
      id: 'purchase',
      title: 'Purchase Management',
      subtitle: 'Supplier Yarn Procurement',
      owner: 'Kishan (Supply Chain)',
      status: 'READY_FOR_INTEGRATION',
      icon: Building2,
      gradient: 'from-sky-600 to-indigo-600',
      badge: 'Integrated Skeleton',
      stats: 'Suppliers & PO Contracts',
      description: 'Yarn trucks arriving at the factory gate with lot tracking, supplier invoices, and stock intake reconciliation.',
      tab: 'docs'
    },
    {
      id: 'dispatch',
      title: 'Dispatch & Logistics',
      subtitle: 'Truck Gate-Out & Roll Verification',
      owner: 'Kishan (Supply Chain)',
      status: 'READY_FOR_INTEGRATION',
      icon: Truck,
      gradient: 'from-amber-600 to-orange-500',
      badge: 'Integrated Skeleton',
      stats: 'Gate Pass & Invoicing',
      description: 'Pack, count, and load finished rolls onto trucks with vehicle numbers and invoices to prevent duplicate delivery.',
      tab: 'docs'
    },
    {
      id: 'manufacturing',
      title: 'Manufacturing Execution',
      subtitle: 'Spinning, Weaving, Dyeing Floors',
      owner: 'Developer 2 (Factory Operations)',
      status: 'ACTIVE_WORKING',
      icon: Cpu,
      gradient: 'from-violet-600 to-purple-500',
      badge: 'Live Factory Module',
      stats: summary?.factoryOperations ? `${summary.factoryOperations.activeProductionOrders} Active Floor Jobs` : 'Machines & Floor Jobs',
      description: 'Real-time machine status (Idle, Running, Breakdown), production orders, and shift floor tracking.',
      tab: 'factory-ops'
    },
    {
      id: 'quality',
      title: 'Quality Control',
      subtitle: 'Fabric Roll Defect Inspection',
      owner: 'Developer 2 (Factory Operations)',
      status: 'ACTIVE_WORKING',
      icon: CheckSquare,
      gradient: 'from-pink-600 to-rose-500',
      badge: 'Live Factory Module',
      stats: summary?.factoryOperations ? `${summary.factoryOperations.qcPassRate} QC Pass Rate` : 'Inspection Slips & Defect Tracking',
      description: 'Inspect rolls for holes, color mismatches, or uneven weaving. Mark rolls as Passed, Rework, or Rejected.',
      tab: 'factory-ops'
    },
    {
      id: 'hr',
      title: 'HR & Worker Attendance',
      subtitle: 'Shift Registers & Wage Payroll',
      owner: 'Developer 2 (Factory Operations)',
      status: 'ACTIVE_WORKING',
      icon: Users,
      gradient: 'from-indigo-600 to-blue-500',
      badge: 'Live Factory Module',
      stats: summary?.factoryOperations ? `${summary.factoryOperations.activeWorkers} Workers Active` : 'Shift Registers & Wages',
      description: 'Track factory workers across morning, evening, and night shifts, calculating wages per shift accurately.',
      tab: 'factory-ops'
    },
    {
      id: 'dashboard',
      title: 'Executive Analytics',
      subtitle: 'Order-to-Cash & Mill Costing',
      owner: 'Joint Work (Kishan + Teammate)',
      status: 'ACTIVE_WORKING',
      icon: BarChart3,
      gradient: 'from-slate-700 to-slate-900',
      badge: 'Joint Integration',
      stats: 'Cross-Module Metrics',
      description: 'Bring raw material bills, worker wages, and buyer revenue together so the owner can instantly see mill profitability.',
      tab: 'grid'
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 border border-slate-700/80 shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <UserCheck className="w-3.5 h-3.5" /> Two-Developer Architecture Blueprint
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Everest Textile Mills — TextileFlow Platform
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Replacing notebooks and phone calls with one unified digital backbone. Built as a single monolithic Express backend on port 5000 connected to a shared Supabase PostgreSQL database.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <strong>Kishan:</strong> Supply Chain & Database Lead
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <strong>Teammate:</strong> Factory Operations Lead
            </div>
          </div>
        </div>

        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
      </div>

      {!dbConnected && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <strong className="font-semibold text-amber-950">Awaiting Supabase PostgreSQL Connection:</strong>
            <p className="text-amber-800 mt-0.5">
              The Express backend is running smoothly, but the database connection string in <code className="bg-amber-200/60 px-1 py-0.5 rounded text-amber-950">backend/.env</code> has the default placeholder. Paste your Supabase credentials to enable persistent data storage and Prisma migrations.
            </p>
          </div>
        </div>
      )}

      {/* Grid of Modules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Functional Modules</h2>
            <p className="text-xs text-slate-500">All running inside ONE monolithic server — no microservices</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((m) => {
            const Icon = m.icon;
            const isLive = m.status === 'ACTIVE_WORKING';

            return (
              <div
                key={m.id}
                onClick={() => setActiveTab(m.tab)}
                className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${m.gradient} flex items-center justify-center text-white shadow-md shadow-slate-200`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isLive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {m.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors text-base">
                    {m.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">{m.subtitle}</p>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                    {m.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Owner</span>
                    <span className="font-semibold text-slate-800">{m.owner}</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-sky-50 group-hover:text-sky-600 flex items-center justify-center text-slate-400 transition-colors">
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
