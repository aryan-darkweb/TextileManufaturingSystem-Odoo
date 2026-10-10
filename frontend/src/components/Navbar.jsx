import React from 'react';
import { Database, Activity, GitFork, ShieldCheck, Layers } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, health, onOpenHealth }) {
  const isHealthy = health?.status === 'healthy';
  const dbConnected = health?.database?.connected;
  const dbConfigured = health?.database?.configured;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('grid')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">TextileFlow</span>
                <span className="text-[10px] uppercase font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full">
                  Everest Textile Mills
                </span>
              </div>
              <p className="text-xs text-slate-400">One Monolithic Express Backend · Shared Supabase Postgres</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {[
              { id: 'grid', label: 'App Grid' },
              { id: 'inventory', label: 'Inventory (Kishan)' },
              { id: 'sales', label: 'Sales Orders (Kishan)' },
              { id: 'factory-ops', label: 'Factory Ops (Teammate)' },
              { id: 'docs', label: 'Shared Setup Guide' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* System & DB Status Indicator */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenHealth}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                dbConnected
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : dbConfigured
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                {dbConnected
                  ? 'Supabase: Connected'
                  : dbConfigured
                  ? 'Supabase: Check Err'
                  : 'Supabase: Unconfigured'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  dbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
