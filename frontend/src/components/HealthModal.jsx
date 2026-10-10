import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Database, Server, RefreshCw } from 'lucide-react';

export function HealthModal({ isOpen, onClose, health, onRefresh, loading }) {
  if (!isOpen) return null;

  const db = health?.database;
  const isConnected = db?.connected;
  const isConfigured = db?.configured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">System & Shared Database Health</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start space-x-3 ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200'
                : isConfigured
                ? 'bg-amber-950/40 border-amber-800/50 text-amber-200'
                : 'bg-rose-950/40 border-rose-800/50 text-rose-200'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            )}
            <div>
              <h4 className="font-semibold text-sm">
                {isConnected
                  ? 'Supabase PostgreSQL Connection Active'
                  : isConfigured
                  ? 'Database Configured But Unreachable'
                  : 'Supabase PostgreSQL Not Yet Configured'}
              </h4>
              <p className="text-xs mt-1 text-slate-300">
                {db?.statusMessage || 'Awaiting connection verification from backend /api/health.'}
              </p>
            </div>
          </div>

          {/* Backend Info Table */}
          <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80 text-xs space-y-2.5">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Architecture</span>
              <span className="font-medium text-white">Monolithic Express Backend (Single Server)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Backend Port</span>
              <span className="font-mono text-sky-400">http://localhost:{health?.port || 5000}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Database Engine</span>
              <span className="text-slate-200">Supabase Hosted PostgreSQL (Prisma ORM)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Credentials Security</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Masked & Kept in backend/.env only
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Server Uptime</span>
              <span className="text-slate-200">{health?.uptimeSeconds ? `${health.uptimeSeconds}s` : 'Active'}</span>
            </div>
          </div>

          {/* Instructions for Kishan / Teammate */}
          {!isConnected && (
            <div className="bg-sky-950/30 border border-sky-800/40 p-4 rounded-xl text-xs space-y-2">
              <h5 className="font-semibold text-sky-300 flex items-center gap-1.5">
                <Database className="w-4 h-4" /> Next Steps to Connect Supabase:
              </h5>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>
                  Open <code className="bg-slate-800 px-1 py-0.5 rounded text-sky-200">backend/.env</code> in your local workspace.
                </li>
                <li>
                  Replace <code className="text-amber-300">PASTE_YOUR_SUPABASE_POSTGRES_CONNECTION_STRING_HERE</code> with your Supabase pooled connection string.
                </li>
                <li>
                  Set <code className="text-amber-300">DIRECT_URL</code> with your Supabase direct port 5432 string for migrations.
                </li>
                <li>
                  Restart backend or click <strong>Re-check Health</strong> below.
                </li>
              </ol>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-check Health</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
