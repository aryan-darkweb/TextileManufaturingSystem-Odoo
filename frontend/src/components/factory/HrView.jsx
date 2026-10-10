import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  UserCheck,
  X,
  Edit2,
  Trash2,
  Save,
  Check,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

const DEPARTMENTS = ['SPINNING', 'WEAVING', 'DYEING', 'QUALITY', 'WAREHOUSE', 'MANAGEMENT'];
const SHIFTS = ['MORNING', 'EVENING', 'NIGHT'];

export function HrView({ dbConnected }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Sub-tabs in HR: 'register' (daily checklist), 'employees' (CRUD), 'monthly' (payroll summary)
  const [activeHrTab, setActiveHrTab] = useState('register');

  // Daily Attendance Checklist State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceShift, setAttendanceShift] = useState('MORNING');
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Employee CRUD Slide-over State
  const [isEmployeeSlideOpen, setIsEmployeeSlideOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeFormData, setEmployeeFormData] = useState({
    employeeCode: '',
    name: '',
    department: 'WEAVING',
    role: 'Weaver Master',
    wagePerShift: '650',
    status: 'ACTIVE',
  });

  // Monthly Summary State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [empRes, attRes] = await Promise.allSettled([
        api.getEmployees(),
        api.getAttendance({ date: attendanceDate, shift: attendanceShift }),
      ]);

      if (empRes.status === 'fulfilled' && empRes.value?.data) {
        setEmployees(empRes.value.data);
        // Initialize daily attendance records
        const initialMap = {};
        empRes.value.data.forEach((e) => {
          initialMap[e.id] = 'PRESENT';
        });

        // Overlay existing recorded attendances if available
        if (attRes.status === 'fulfilled' && Array.isArray(attRes.value?.data)) {
          attRes.value.data.forEach((a) => {
            initialMap[a.employeeId] = a.status;
          });
        }
        setAttendanceRecords(initialMap);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load employee & attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForDateShift = async (d, s) => {
    try {
      const res = await api.getAttendance({ date: d, shift: s });
      if (res?.data && Array.isArray(res.data)) {
        const updated = { ...attendanceRecords };
        res.data.forEach((a) => {
          updated[a.employeeId] = a.status;
        });
        setAttendanceRecords(updated);
      }
    } catch {
      // ignore
    }
  };

  const fetchMonthlySummary = async (m) => {
    setLoadingSummary(true);
    try {
      const res = await api.getAttendanceSummary(m);
      if (res?.data) {
        setMonthlySummary(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load monthly summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeHrTab === 'monthly') {
      fetchMonthlySummary(selectedMonth);
    }
  }, [activeHrTab, selectedMonth]);

  const handleDateChange = (newDate) => {
    setAttendanceDate(newDate);
    fetchAttendanceForDateShift(newDate, attendanceShift);
  };

  const handleShiftChange = (newShift) => {
    setAttendanceShift(newShift);
    fetchAttendanceForDateShift(attendanceDate, newShift);
  };

  const handleMarkAllPresent = () => {
    const updated = {};
    employees.forEach((e) => {
      if (e.status === 'ACTIVE') {
        updated[e.id] = 'PRESENT';
      }
    });
    setAttendanceRecords(updated);
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    setErrorMsg(null);
    try {
      const records = employees
        .filter((e) => e.status === 'ACTIVE')
        .map((e) => ({
          employeeId: e.id,
          status: attendanceRecords[e.id] || 'PRESENT',
        }));

      await api.recordBulkAttendance({
        date: attendanceDate,
        shift: attendanceShift,
        records,
      });

      setSuccessMsg(`Attendance saved for ${attendanceDate} (${attendanceShift} Shift)!`);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleOpenNewEmployee = () => {
    setEditingEmployee(null);
    const nextCode = `EMP-${100 + employees.length + 1}`;
    setEmployeeFormData({
      employeeCode: nextCode,
      name: '',
      department: 'WEAVING',
      role: 'Weaver Master',
      wagePerShift: '650',
      status: 'ACTIVE',
    });
    setIsEmployeeSlideOpen(true);
  };

  const handleOpenEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEmployeeFormData({
      employeeCode: emp.employeeCode,
      name: emp.name,
      department: emp.department,
      role: emp.role,
      wagePerShift: String(emp.wagePerShift),
      status: emp.status,
    });
    setIsEmployeeSlideOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setSavingEmployee(true);
    setErrorMsg(null);
    try {
      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, {
          name: employeeFormData.name,
          department: employeeFormData.department,
          role: employeeFormData.role,
          wagePerShift: parseFloat(employeeFormData.wagePerShift),
          status: employeeFormData.status,
        });
        setSuccessMsg(`Employee ${employeeFormData.name} updated successfully!`);
      } else {
        await api.createEmployee({
          employeeCode: employeeFormData.employeeCode,
          name: employeeFormData.name,
          department: employeeFormData.department,
          role: employeeFormData.role,
          wagePerShift: parseFloat(employeeFormData.wagePerShift),
        });
        setSuccessMsg(`Employee ${employeeFormData.name} registered successfully!`);
      }
      setIsEmployeeSlideOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save employee');
    } finally {
      setSavingEmployee(false);
    }
  };

  // Filtered employees list
  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      !searchTerm ||
      e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.role?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = departmentFilter === 'ALL' || e.department === departmentFilter;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-start justify-between gap-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-start justify-between gap-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>{successMsg}</div>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HR Navigation Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveHrTab('register')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeHrTab === 'register'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Daily Attendance Register
          </button>
          <button
            onClick={() => setActiveHrTab('employees')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeHrTab === 'employees'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Employee Directory ({employees.length})
          </button>
          <button
            onClick={() => setActiveHrTab('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeHrTab === 'monthly'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Monthly Payroll & Attendance Summary
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {activeHrTab === 'employees' && (
            <button
              onClick={handleOpenNewEmployee}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* 1. DAILY ATTENDANCE CHECKLIST */}
      {activeHrTab === 'register' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-700">Date:</label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={attendanceDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-700">Shift:</label>
                <select
                  value={attendanceShift}
                  onChange={(e) => handleShiftChange(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500"
                >
                  {SHIFTS.map((s) => (
                    <option key={s} value={s}>
                      {s} Shift
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Mark All Present
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                {savingAttendance ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Shift Register
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Employee Code</th>
                  <th className="py-3 px-4">Worker Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Wage / Shift</th>
                  <th className="py-3 px-4 text-center">Shift Status</th>
                  <th className="py-3 px-4 text-right">Calculated Wage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees
                  .filter((e) => e.status === 'ACTIVE')
                  .map((emp) => {
                    const status = attendanceRecords[emp.id] || 'PRESENT';
                    const calculatedWage =
                      status === 'PRESENT'
                        ? emp.wagePerShift
                        : status === 'HALF_DAY'
                        ? emp.wagePerShift * 0.5
                        : 0;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{emp.employeeCode}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{emp.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {emp.department}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{emp.role}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          ₹{emp.wagePerShift}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            {['PRESENT', 'HALF_DAY', 'ABSENT', 'LEAVE'].map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setAttendanceRecords({
                                    ...attendanceRecords,
                                    [emp.id]: st,
                                  })
                                }
                                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                                  status === st
                                    ? st === 'PRESENT'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : st === 'HALF_DAY'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : st === 'ABSENT'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-sky-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {st === 'HALF_DAY' ? 'Half' : st}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{calculatedWage}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. EMPLOYEE DIRECTORY */}
      {activeHrTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, code, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Wage / Shift</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{emp.employeeCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{emp.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {emp.department}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{emp.role}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{emp.wagePerShift}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          emp.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : emp.status === 'ON_LEAVE'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditEmployee(emp)}
                        className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100"
                        title="Edit Worker"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MONTHLY ATTENDANCE SUMMARY */}
      {activeHrTab === 'monthly' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Payroll Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500 font-bold"
              />
            </div>

            <button
              onClick={() => fetchMonthlySummary(selectedMonth)}
              disabled={loadingSummary}
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg border border-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {monthlySummary && (
            <>
              {/* Totals KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Workforce</span>
                  <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                    {monthlySummary.millTotals?.totalEmployees}
                  </div>
                  <span className="text-[10px] text-slate-500">Active Mill Workers</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Shifts Logged</span>
                  <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                    {monthlySummary.millTotals?.totalShiftsWorked}
                  </div>
                  <span className="text-[10px] text-slate-500">Present & Half Shifts</span>
                </div>

                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Total Mill Wage Payout</span>
                  <div className="text-2xl font-black text-emerald-950 mt-1 font-mono">
                    ₹{monthlySummary.millTotals?.totalWagePayout?.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-700">Calculated Payout for {monthlySummary.month}</span>
                </div>
              </div>

              {/* Monthly Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Worker</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-center">Present</th>
                      <th className="py-3 px-4 text-center">Half Days</th>
                      <th className="py-3 px-4 text-center">Leaves</th>
                      <th className="py-3 px-4 text-center">Absents</th>
                      <th className="py-3 px-4 text-right">Total Wage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlySummary.employeeSummary?.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{emp.employeeCode}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{emp.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {emp.department}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700">{emp.presentDays}</td>
                        <td className="py-3 px-4 text-center font-bold text-amber-700">{emp.halfDays}</td>
                        <td className="py-3 px-4 text-center font-bold text-sky-700">{emp.leaveDays}</td>
                        <td className="py-3 px-4 text-center font-bold text-rose-700">{emp.absentDays}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          ₹{emp.totalWages?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ADD / EDIT EMPLOYEE SLIDE-OVER */}
      {isEmployeeSlideOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingEmployee ? 'Edit Mill Worker' : 'Register New Employee'}
                  </h3>
                  <p className="text-xs text-slate-500">Floor workers, operators, weavers, and shift wage</p>
                </div>
                <button
                  onClick={() => setIsEmployeeSlideOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEmployee} id="employee-form" className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employee Code *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingEmployee)}
                    value={employeeFormData.employeeCode}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, employeeCode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={employeeFormData.name}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                    placeholder="Worker Name"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={employeeFormData.department}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, department: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role / Job Title *</label>
                  <input
                    type="text"
                    required
                    value={employeeFormData.role}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                    placeholder="Weaving Master, Ring Frame Operator..."
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wage per Shift (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={employeeFormData.wagePerShift}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, wagePerShift: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold"
                  />
                </div>

                {editingEmployee && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employment Status</label>
                    <select
                      value={employeeFormData.status}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, status: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ON_LEAVE">ON_LEAVE</option>
                      <option value="TERMINATED">TERMINATED (Soft Delete)</option>
                    </select>
                  </div>
                )}
              </form>
            </div>

            <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEmployeeSlideOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="employee-form"
                disabled={savingEmployee}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                {savingEmployee && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {editingEmployee ? 'Update Worker' : 'Register Worker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
