import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckSquare,
  Users,
  Code2,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export function FactoryOpsView() {
  const [machines, setMachines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getManufacturingMachines(),
      api.getHrEmployees(),
    ]).then(([mRes, eRes]) => {
      if (mRes.status === 'fulfilled' && mRes.value?.data) {
        setMachines(mRes.value.data);
      }
      if (eRes.status === 'fulfilled' && eRes.value?.data) {
        setEmployees(eRes.value.data);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E8DFEF] pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[#292235]">Factory Operations</h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EEE5F7] text-[#503568] border border-[#DFCFF0]">
            In Progress / Skeletons
          </span>
        </div>
        <p className="text-xs text-[#766D82] mt-1 max-w-3xl">
          Factory floor operational modules. Database models (Machine, ProductionOrder, QualityInspection, Employee, Attendance) are active in the shared schema with REST endpoints wired in the monolithic Express server.
        </p>
      </div>

      {/* Grid of 3 Factory Operations Areas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Manufacturing */}
        <div className="bg-white rounded-2xl border border-[#E8DFEF] p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#EEE5F7] text-[#503568] flex items-center justify-center mb-4 shadow-2xs">
              <Cpu className="w-6 h-6 text-[#7950A8]" />
            </div>
            <span className="text-[10px] uppercase font-bold text-[#7950A8] tracking-wider">Module 01</span>
            <h2 className="text-base font-bold text-[#292235] mt-1">Manufacturing & Floor Machines</h2>
            <p className="text-xs text-[#766D82] mt-2 leading-relaxed">
              Tracking spinning, weaving, and dyeing machines (Ring Frames, Airjets, Dyeing Jiggers). Real-time machine status (Idle, Running, Maintenance, Breakdown) and batch scheduling.
            </p>

            <div className="mt-4 p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] text-xs space-y-1.5">
              <span className="font-semibold text-[#292235] block">Database Models:</span>
              <div className="font-mono text-[11px] text-[#766D82]">
                • <code>Machine</code> (code, type, status, capacity)
                <br />• <code>ProductionOrder</code> (orderNumber, stage, qty)
              </div>
            </div>

            {machines.length > 0 && (
              <div className="mt-3 text-[11px] text-[#503568] font-semibold">
                {machines.length} floor machines configured in database
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#F3EEF8]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#766D82]">Status:</span>
              <span className="font-semibold text-[#503568] bg-[#EEE5F7] px-2 py-0.5 rounded border border-[#DFCFF0]">
                In Progress
              </span>
            </div>
            <p className="text-[11px] text-[#766D82] mt-1">
              Endpoint: <code>/api/manufacturing/orders</code>
            </p>
          </div>
        </div>

        {/* 2. Quality Control */}
        <div className="bg-white rounded-2xl border border-[#E8DFEF] p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#EEE5F7] text-[#503568] flex items-center justify-center mb-4 shadow-2xs">
              <CheckSquare className="w-6 h-6 text-[#7950A8]" />
            </div>
            <span className="text-[10px] uppercase font-bold text-[#7950A8] tracking-wider">Module 02</span>
            <h2 className="text-base font-bold text-[#292235] mt-1">Quality Control & Roll Inspection</h2>
            <p className="text-xs text-[#766D82] mt-2 leading-relaxed">
              Roll inspection records replacing paper slips: inspect fabric rolls for holes, color mismatches, or uneven weaving. Mark rolls as Passed, Rework, or Rejected before packing.
            </p>

            <div className="mt-4 p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] text-xs space-y-1.5">
              <span className="font-semibold text-[#292235] block">Database Models:</span>
              <div className="font-mono text-[11px] text-[#766D82]">
                • <code>QualityInspection</code> (rollNumber, defectType, status, meters)
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F3EEF8]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#766D82]">Status:</span>
              <span className="font-semibold text-[#503568] bg-[#EEE5F7] px-2 py-0.5 rounded border border-[#DFCFF0]">
                In Progress
              </span>
            </div>
            <p className="text-[11px] text-[#766D82] mt-1">
              Endpoint: <code>/api/quality/inspections</code>
            </p>
          </div>
        </div>

        {/* 3. HR & Attendance */}
        <div className="bg-white rounded-2xl border border-[#E8DFEF] p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#EEE5F7] text-[#503568] flex items-center justify-center mb-4 shadow-2xs">
              <Users className="w-6 h-6 text-[#7950A8]" />
            </div>
            <span className="text-[10px] uppercase font-bold text-[#7950A8] tracking-wider">Module 03</span>
            <h2 className="text-base font-bold text-[#292235] mt-1">HR & Floor Attendance</h2>
            <p className="text-xs text-[#766D82] mt-2 leading-relaxed">
              Replacing register muster books: record mill workers across shifts (Morning, Evening, Night) with automated shift wage calculations for monthly payroll.
            </p>

            <div className="mt-4 p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF] text-xs space-y-1.5">
              <span className="font-semibold text-[#292235] block">Database Models:</span>
              <div className="font-mono text-[11px] text-[#766D82]">
                • <code>Employee</code> (employeeCode, name, department, wagePerShift)
                <br />• <code>Attendance</code> (shift, date, status, wageCalculated)
              </div>
            </div>

            {employees.length > 0 && (
              <div className="mt-3 text-[11px] text-[#503568] font-semibold">
                {employees.length} workers registered in database
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#F3EEF8]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#766D82]">Status:</span>
              <span className="font-semibold text-[#503568] bg-[#EEE5F7] px-2 py-0.5 rounded border border-[#DFCFF0]">
                In Progress
              </span>
            </div>
            <p className="text-[11px] text-[#766D82] mt-1">
              Endpoint: <code>/api/hr/attendance</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
