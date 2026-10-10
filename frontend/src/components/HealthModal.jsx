import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Database, Server, RefreshCw } from 'lucide-react';

export function HealthModal({ isOpen, onClose, health, onRefresh, loading }) {
  if (!isOpen) return null;

  const db = health?.database;
  const isConnected = db?.connected;
  const isConfigured = db?.configured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#E8DFEF] text-[#292235] animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#E8DFEF] flex items-center justify-between bg-[#FAF7FC]">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-[#7950A8]" />
            <h3 className="text-sm font-bold text-[#292235]">Database & System Health</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start space-x-3 ${
              isConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : isConfigured
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div>
              <h4 className="font-bold text-xs">
                {isConnected
                  ? 'Supabase PostgreSQL Connection Active'
                  : isConfigured
                  ? 'Database Configured But Unreachable'
                  : 'Database Not Configured'}
              </h4>
              <p className="text-xs mt-1 text-[#766D82]">
                {db?.statusMessage || 'Verifying connection status via backend health check.'}
              </p>
            </div>
          </div>

          {/* Backend Specs Table */}
          <div className="bg-[#FAF7FC] rounded-xl p-4 border border-[#E8DFEF] text-xs space-y-2.5">
            <div className="flex justify-between py-1 border-b border-[#E8DFEF]">
              <span className="text-[#766D82]">Architecture</span>
              <span className="font-medium text-[#292235]">Monolithic Express Server</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E8DFEF]">
              <span className="text-[#766D82]">Backend Port</span>
              <span className="font-mono font-medium text-[#7950A8]">Port {health?.port || 5000}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E8DFEF]">
              <span className="text-[#766D82]">Database Engine</span>
              <span className="text-[#292235]">Supabase PostgreSQL (Prisma ORM)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E8DFEF]">
              <span className="text-[#766D82]">Credentials Isolation</span>
              <span className="text-emerald-700 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Stored in backend/.env only
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#766D82]">Server Uptime</span>
              <span className="text-[#292235] font-medium">{health?.uptimeSeconds ? `${health.uptimeSeconds}s` : 'Active'}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#E8DFEF] bg-[#FAF7FC] flex justify-between items-center">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E8DFEF] text-[#503568] hover:bg-[#EEE5F7] transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
            <span>Re-check Health</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#7950A8] hover:bg-[#674191] text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
