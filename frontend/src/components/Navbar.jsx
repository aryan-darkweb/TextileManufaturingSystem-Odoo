import React from 'react';
import { Database, Layers, LayoutGrid, Package, ShoppingCart, Truck, ShoppingBag, BarChart3, Factory } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, health, onOpenHealth }) {
  const dbConnected = health?.database?.connected;
  const dbConfigured = health?.database?.configured;

  const navItems = [
    { id: 'grid', label: 'App Grid', icon: LayoutGrid },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'sales', label: 'Sales Orders', icon: ShoppingCart },
    { id: 'purchase', label: 'Purchases', icon: ShoppingBag },
    { id: 'dispatch', label: 'Dispatch', icon: Truck },
    { id: 'factory', label: 'Factory Ops', icon: Factory },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  return (
    <header className="bg-white border-b border-[#E8DFEF] sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer group select-none"
            onClick={() => setActiveTab('grid')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#503568] via-[#674191] to-[#7950A8] flex items-center justify-center shadow-md shadow-[#7950A8]/20 transition-transform group-hover:scale-105">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-[#292235]">TextileFlow</span>
                <span className="text-[11px] font-medium text-[#766D82]">ERP</span>
              </div>
              <p className="text-[11px] text-[#766D82] -mt-0.5">Textile Mills Platform</p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#EEE5F7] text-[#503568] shadow-xs'
                      : 'text-[#766D82] hover:text-[#292235] hover:bg-[#FAF7FC]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#7950A8]' : 'text-[#766D82]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Database Health Pill */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenHealth}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                dbConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : dbConfigured
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
              title="Click to view database connection status"
            >
              <Database className="w-3.5 h-3.5 text-current" />
              <span>
                {dbConnected
                  ? 'Database Connected'
                  : dbConfigured
                  ? 'Database Check'
                  : 'Database Offline'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  dbConnected
                    ? 'bg-emerald-500 animate-pulse'
                    : dbConfigured
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Navigation Scroll */}
        <div className="flex lg:hidden overflow-x-auto py-2 border-t border-[#F3EEF8] space-x-1 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-[#EEE5F7] text-[#503568] font-semibold'
                    : 'text-[#766D82] hover:bg-[#FAF7FC]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
