import React from 'react';
import { Database, GitMerge, Server, Shield, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';

export function ArchitectureDocsView() {
  const steps = [
    {
      num: '1',
      title: 'Kishan Creates Supabase Project',
      desc: 'Creates the Supabase project in the Supabase Dashboard and configures the PostgreSQL database.',
    },
    {
      num: '2',
      title: 'Kishan Configures backend/.env',
      desc: 'Pastes the Supabase connection strings (DATABASE_URL and DIRECT_URL) into local backend/.env.',
    },
    {
      num: '3',
      title: 'Kishan Generates Initial Prisma Schema & Migrations',
      desc: 'Runs prisma migrate dev to establish all tables on Supabase and commits schema.prisma and migrations/ to Git.',
    },
    {
      num: '4',
      title: 'Teammate Clones Same GitHub Repository',
      desc: 'Clones the single TextileFlow repository containing both backend and frontend.',
    },
    {
      num: '5',
      title: 'Teammate Creates Their Own backend/.env',
      desc: 'Configures the connection strings pointing to the EXACT same shared Supabase database.',
    },
    {
      num: '6',
      title: 'Both Developers Run Same Backend Locally',
      desc: 'Both run npm run dev inside backend/ on port 5000 on their respective machines.',
    },
    {
      num: '7',
      title: 'Shared Database Real-Time Data Flow',
      desc: 'Committed records created through one developer’s API (e.g. Sales Order by Kishan) can be immediately retrieved by the other (e.g. Production Order by Teammate).',
    },
    {
      num: '8',
      title: 'Integrated Single Deployment',
      desc: 'In production, deploy ONE Express backend connected to the shared Supabase database.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shared Architecture & Database Workflow</h1>
        <p className="text-xs text-slate-500 mt-1">
          Standardized guidelines for two-developer collaboration on Everest Textile Mills.
        </p>
      </div>

      {/* 8-Step Workflow */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Database className="w-5 h-5 text-sky-600" />
          <h2 className="text-base font-bold text-slate-900">The 8-Step Shared Database Collaboration Flow</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s) => (
            <div key={s.num} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
                {s.num}
              </span>
              <h3 className="font-bold text-slate-800 text-xs">{s.title}</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strict Migration Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Database & Migration Rules</h2>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>Commit Every Migration:</strong> All schema changes must use <code>prisma migrate dev</code> and the generated SQL files in <code>backend/prisma/migrations/</code> must be committed to Git.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>Coordinated Schema Ownership:</strong> Kishan manages Supply Chain models; Teammate manages Factory Ops models. Schema updates must be discussed before applying.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <span>
                <strong>Never use prisma db push:</strong> Once shared migrations are in place, avoid <code>db push</code> as it bypasses migration tracking and can cause desync.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <span>
                <strong>Never Reset Shared DB:</strong> Never execute <code>prisma migrate reset</code> against the shared Supabase database.
              </span>
            </li>
          </ul>
        </div>

        {/* Monolithic Server Architecture */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Strict Monolithic Architecture</h2>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>One Express Application:</strong> All modules (Inventory, Sales, Purchase, Dispatch, Manufacturing, Quality, HR, Dashboard) run inside ONE server process on port 5000.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>No Python / FastAPI / Microservices:</strong> Everything is written in clean Node.js + Express with Prisma ORM.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
              <span>
                <strong>Secrets Security:</strong> <code>DATABASE_URL</code> is never exposed to the frontend (no <code>VITE_</code> prefix). Only backend accesses Postgres.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Terminal className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
              <span>
                <strong>Transactions for Multi-Record Updates:</strong> Atomic transactions (<code>prisma.$transaction</code>) are used for order creation and inventory movements.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
