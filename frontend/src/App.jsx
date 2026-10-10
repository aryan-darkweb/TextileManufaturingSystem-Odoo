import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HealthModal } from './components/HealthModal';
import { ModuleGrid } from './components/ModuleGrid';
import { InventoryView } from './components/InventoryView';
import { SalesOrdersView } from './components/SalesOrdersView';
import { FactoryOpsSkeletonView } from './components/FactoryOpsSkeletonView';
import { ArchitectureDocsView } from './components/ArchitectureDocsView';
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-sky-500 selection:text-white">
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
        {activeTab === 'factory-ops' && <FactoryOpsSkeletonView />}
        {activeTab === 'docs' && <ArchitectureDocsView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-800">TextileFlow</span> — Everest Textile Mills Digital Backbone
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>React + Vite</span>
            <span>•</span>
            <span>Monolithic Express (Port 5000)</span>
            <span>•</span>
            <span>Supabase PostgreSQL + Prisma</span>
          </div>
        </div>
      </footer>

      {/* System Health Details Modal */}
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
