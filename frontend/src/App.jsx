import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HealthModal } from './components/HealthModal';
import { ModuleGrid } from './components/ModuleGrid';
import { InventoryView } from './components/InventoryView';
import { SalesOrdersView } from './components/SalesOrdersView';
import { PurchaseOrdersView } from './components/PurchaseOrdersView';
import { DispatchView } from './components/DispatchView';
import { FactoryOpsView } from './components/factory/FactoryOpsView';
import { DashboardView } from './components/DashboardView';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState('grid');
  const [health, setHealth] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await api.getHealth();
      if (res?.data) {
        setHealth(res.data);
      }
    } catch (err) {
      setHealth({
        status: 'offline',
        port: 5000,
        database: {
          configured: false,
          connected: false,
          statusMessage: err.message || 'Express backend unreachable on port 5000',
        },
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.getDashboardSummary();
      if (res?.data) {
        setDashboardSummary(res.data);
      }
    } catch {
      // Degraded / DB pending
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchDashboard();
  }, []);

  const dbConnected = Boolean(health?.database?.connected);

  return (
    <div className="min-h-screen bg-[#FAF7FC] flex flex-col font-sans text-[#292235] antialiased selection:bg-[#7950A8] selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        onOpenHealth={() => setIsHealthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'grid' && (
          <ModuleGrid
            setActiveTab={setActiveTab}
            summary={dashboardSummary}
            dbConnected={dbConnected}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryView
            dbConnected={dbConnected}
            onOpenHealth={() => setIsHealthModalOpen(true)}
          />
        )}
        {activeTab === 'sales' && (
          <SalesOrdersView
            dbConnected={dbConnected}
            onOpenHealth={() => setIsHealthModalOpen(true)}
          />
        )}
        {activeTab === 'purchase' && (
          <PurchaseOrdersView
            dbConnected={dbConnected}
            onOpenHealth={() => setIsHealthModalOpen(true)}
          />
        )}
        {activeTab === 'dispatch' && (
          <DispatchView
            dbConnected={dbConnected}
            onOpenHealth={() => setIsHealthModalOpen(true)}
          />
        )}
        {(activeTab === 'factory' || activeTab === 'factory-ops') && (
          <FactoryOpsView
            dbConnected={dbConnected}
            onOpenHealth={() => setIsHealthModalOpen(true)}
            initialTab="today"
          />
        )}
        {activeTab === 'manufacturing' && (
          <FactoryOpsView
            dbConnected={dbConnected}
            onOpenHealth={() => setIsHealthModalOpen(true)}
            initialTab="production"
          />
        )}
        {activeTab === 'quality' && (
          <FactoryOpsView
            dbConnected={dbConnected}
            onOpenHealth={() => setIsHealthModalOpen(true)}
            initialTab="quality"
          />
        )}
        {activeTab === 'hr' && (
          <FactoryOpsView
            dbConnected={dbConnected}
            onOpenHealth={() => setIsHealthModalOpen(true)}
            initialTab="hr"
          />
        )}
        {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
      </main>

      {/* Clean ERP Footer - No Architecture Clutter */}
      <footer className="bg-white border-t border-[#E8DFEF] py-6 mt-12 text-sm text-[#766D82]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-bold text-[#503568]">TextileFlow</span> — Textile Mills Operations & Supply Chain
          </div>
          <div className="flex items-center gap-4 text-sm text-[#766D82]">
            <span>Inventory</span>
            <span>•</span>
            <span>Sales</span>
            <span>•</span>
            <span>Purchases</span>
            <span>•</span>
            <span>Dispatch</span>
            <span>•</span>
            <span>Factory Ops</span>
          </div>
        </div>
      </footer>

      {/* System Health Modal */}
      <HealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        health={health}
        onRefresh={fetchHealth}
        loading={loadingHealth}
      />
    </div>
  );
}

export default App;
