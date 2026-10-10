import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckSquare,
  Users,
  Code2,
  CheckCircle2,
  GitBranch,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export function FactoryOpsSkeletonView() {
  const [statuses, setStatuses] = useState({
    manufacturing: null,
    quality: null,
    hr: null,
  });

  useEffect(() => {
    Promise.allSettled([
      api.getManufacturingStatus(),
      api.getQualityStatus(),
      api.getHrStatus(),
    ]).then(([mRes, qRes, hRes]) => {
      setStatuses({
        manufacturing: mRes.status === 'fulfilled' ? mRes.value?.data : null,
        quality: qRes.status === 'fulfilled' ? qRes.value?.data : null,
        hr: hRes.status === 'fulfilled' ? hRes.value?.data : null,
      });
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Factory Operations (Teammate Lead)</h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            Integration-Ready Skeletons
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          These modules are reserved for the Factory Operations teammate. Models (Machine, ProductionOrder, QualityInspection, Employee, Attendance) are already defined in the shared Prisma schema, and corresponding REST routes are wired in the monolithic Express server.
        </p>
      </div>

      {/* Grid of 3 Teammate Areas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Manufacturing */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-4">
              <Cpu className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase font-bold text-violet-600 tracking-wider">Module 01</span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Manufacturing & Floor Machines</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Tracking spinning, weaving, and dyeing machines (Rieter Ring Frames, Picanol Airjets, Dyeing Jiggers). Floor job progress, shift capacity, and downtime tracking.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <span className="font-semibold text-slate-700 block">Shared Database Models:</span>
              <div className="font-mono text-[11px] text-slate-600">
                • <code>Machine</code> (code, type, status, capacity)
                <br />• <code>ProductionOrder</code> (orderNumber, stage, qty)
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Status:</span>
              <span className="font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                Skeleton Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Endpoint: <code>/api/manufacturing/orders</code>
            </p>
          </div>
        </div>

        {/* 2. Quality Control */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center mb-4">
              <CheckSquare className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase font-bold text-pink-600 tracking-wider">Module 02</span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Quality Control & Inspection</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Paper slip replacement: inspect rolls for holes, color mismatches, or uneven weaving before packing. Trace defects back to specific machines and yarn batches.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <span className="font-semibold text-slate-700 block">Shared Database Models:</span>
              <div className="font-mono text-[11px] text-slate-600">
                • <code>QualityInspection</code> (rollNumber, defectType, status, meters)
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Status:</span>
              <span className="font-semibold text-pink-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                Skeleton Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Endpoint: <code>/api/quality/inspections</code>
            </p>
          </div>
        </div>

        {/* 3. HR & Attendance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Module 03</span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">HR & Floor Attendance</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Replacing the register book: record mill workers across shifts (Morning, Evening, Night) with automated wage calculations for monthly owner payroll.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <span className="font-semibold text-slate-700 block">Shared Database Models:</span>
              <div className="font-mono text-[11px] text-slate-600">
                • <code>Employee</code> (code, name, department, wage)
                <br />• <code>Attendance</code> (shift, date, status, wageCalc)
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Status:</span>
              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Skeleton Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Endpoint: <code>/api/hr/attendance</code>
            </p>
          </div>
        </div>
      </div>

      {/* Integration Agreement Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-base text-white">How Teammate Builds Upon This Foundation</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Both developers work in the <strong>same repository</strong> and use the <strong>same Express backend</strong>. When the Factory Operations teammate starts work, they will:
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pt-1">
              <li>Pull latest commits from GitHub repository.</li>
              <li>Configure their local <code className="bg-slate-800 px-1 py-0.5 rounded text-sky-300">backend/.env</code> with the shared Supabase connection string.</li>
              <li>Implement business logic inside <code className="bg-slate-800 px-1 py-0.5 rounded text-sky-300">backend/src/services/manufacturing.service.js</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-sky-300">quality.service.js</code>, and <code className="bg-slate-800 px-1 py-0.5 rounded text-sky-300">hr.service.js</code>.</li>
              <li>Connect React UI components to the existing Express endpoints on port 5000.</li>
            </ol>
            <p className="text-[11px] text-slate-400 pt-2">
              Full contract documented in: <code className="text-sky-300">docs/INTEGRATION_CONTRACT.md</code> and <code className="text-sky-300">docs/MODULE_OWNERSHIP.md</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
