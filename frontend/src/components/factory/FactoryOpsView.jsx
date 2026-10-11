import React, { useState } from 'react';
import {
  Cpu,
  CheckSquare,
  Users,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FactoryTodayView } from './FactoryTodayView';
import { ProductionView } from './ProductionView';
import { QualityView } from './QualityView';
import { MachineDailyOutputView } from './MachineDailyOutputView';

export function FactoryOpsView({ dbConnected, onOpenHealth, initialTab = 'today' }) {
  const [subTab, setSubTab] = useState(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setSubTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Module Navigation Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Factory Operations
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 uppercase tracking-wider">
                Floor Digital Backbone
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Execution, machine output scheduling, and quality rolls inspection for Everest Textile Mills. Monolithic Express APIs & shared Supabase PostgreSQL.
            </p>
          </div>

          {/* Sub-tab Navigation Pills */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl self-start sm:self-auto border border-slate-300/70 flex-wrap">
            <button
              onClick={() => setSubTab('today')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-sky-600" />
              Factory Today
            </button>

            <button
              onClick={() => setSubTab('machine-output')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'machine-output'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-violet-600" />
              Machine Daily Output
            </button>

            <button
              onClick={() => setSubTab('production')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'production'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-violet-600" />
              Manufacturing
            </button>

            <button
              onClick={() => setSubTab('quality')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'quality'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-pink-600" />
              Quality Control
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Sub-tab View */}
      {subTab === 'today' && (
        <FactoryTodayView onSwitchTab={setSubTab} dbConnected={dbConnected} />
      )}
      {subTab === 'machine-output' && (
        <MachineDailyOutputView dbConnected={dbConnected} />
      )}
      {subTab === 'production' && <ProductionView dbConnected={dbConnected} />}
      {subTab === 'quality' && <QualityView dbConnected={dbConnected} />}
    </div>
  );
}

