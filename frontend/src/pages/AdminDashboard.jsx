import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  Users, Stethoscope, Clock, Building2, UserPlus, FolderPlus, 
  BarChart3, RefreshCw, CheckCircle, AlertTriangle, Activity, Check, Plus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import StatCard from '../components/StatCard';
import SafetyDisclaimer from '../components/SafetyDisclaimer';

const COLORS = ['#0ea5e9', '#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function AdminDashboard() {
  const { user } = useAuth();

  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);

  // New Doctor Form
  const [docForm, setDocForm] = useState({
    full_name: '',
    email: '',
    password: 'doctor123',
    department_id: '',
    specialization: '',
    room_number: '',
    avg_consultation_time: 12.0
  });

  // New Dept Form
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    base_consultation_time: 12.0
  });

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadAllAdminData();
    const interval = setInterval(loadAllAdminData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAllAdminData = async () => {
    try {
      const [over, anal, docs, depts, appts] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminAnalytics(),
        api.getDoctors(),
        api.getDepartments(),
        api.getAppointments()
      ]);
      setOverview(over);
      setAnalytics(anal);
      setDoctors(docs || []);
      setDepartments(depts || []);
      setAppointments(appts || []);
    } catch (err) {
      console.error("Admin data loading error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await api.createDoctor({
        ...docForm,
        department_id: Number(docForm.department_id),
        avg_consultation_time: Number(docForm.avg_consultation_time)
      });
      setShowDoctorModal(false);
      setDocForm({
        full_name: '',
        email: '',
        password: 'doctor123',
        department_id: '',
        specialization: '',
        room_number: '',
        avg_consultation_time: 12.0
      });
      loadAllAdminData();
    } catch (err) {
      setFormError(err.message || 'Failed to add doctor');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await api.createDepartment({
        ...deptForm,
        base_consultation_time: Number(deptForm.base_consultation_time)
      });
      setShowDeptModal(false);
      setDeptForm({
        name: '',
        code: '',
        description: '',
        base_consultation_time: 12.0
      });
      loadAllAdminData();
    } catch (err) {
      setFormError(err.message || 'Failed to add department');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDoctorStatusToggle = async (docId, currentStatus) => {
    const nextStatus = currentStatus === 'available' ? 'on_break' : 'available';
    try {
      await api.updateDoctorStatus(docId, { status: nextStatus });
      loadAllAdminData();
    } catch (err) {
      alert("Status update failed");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Hospital Administration Portal</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Executive OPD Management & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor clinic throughput, manage clinical rosters, and audit AI waiting-time performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowDeptModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4" />
            + Department
          </button>
          <button
            onClick={() => setShowDoctorModal(true)}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-md shadow-sky-600/20 transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            + Doctor
          </button>
          <button
            onClick={() => {
              setRefreshing(true);
              loadAllAdminData();
            }}
            className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview Stat Cards (Requirement 6 & 9) */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Patients Today"
            value={overview.total_patients_today}
            subtitle="Registered OPD visits"
            icon={Users}
            color="indigo"
          />
          <StatCard
            title="Waiting in Queue"
            value={overview.waiting_patients}
            subtitle={`${overview.consulting_patients} currently in exam`}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Avg Waiting Time"
            value={overview.avg_waiting_time}
            unit="min"
            subtitle={`Peak wait: ${overview.max_waiting_time} min`}
            icon={Activity}
            color="sky"
          />
          <StatCard
            title="Available Staff"
            value={`${overview.available_doctors}/${overview.total_doctors}`}
            subtitle={`${overview.no_shows_today} no-shows / cancelled`}
            icon={Stethoscope}
            color="emerald"
          />
        </div>
      )}

      {/* Analytics Charts Grid (Section 6 & 9) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Patients per Hour */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Patients & Wait Time by Hour (OPD Rush)</h2>
              <p className="text-xs text-slate-500">Hourly patient volume and predicted waiting curve</p>
            </div>
            <BarChart3 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.hourlyDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Bar dataKey="patients" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Daily Queue Volume */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daily Queue Volume & Average Wait Trend</h2>
              <p className="text-xs text-slate-500">Weekly operational load tracking</p>
            </div>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.weeklyVolume || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="volume" stroke="#0ea5e9" strokeWidth={3} name="Total Volume" />
                <Line type="monotone" dataKey="avgWait" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" name="Avg Wait (min)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Department-wise Patient Count */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Department Patient Distribution</h2>
              <p className="text-xs text-slate-500">Breakdown of queue by medical specialty</p>
            </div>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.departmentDistribution || []}
                  dataKey="patientCount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {(analytics?.departmentDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Doctor Workload Table & Status (Requirement 6 & 9) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Doctor Consultation Workload</h2>
              <p className="text-xs text-slate-500">Real-time status and throughput per clinician</p>
            </div>
            <Stethoscope className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="overflow-y-auto max-h-60 space-y-2">
            {doctors.map((doc) => {
              const isAvailable = doc.status === 'available';
              return (
                <div key={doc.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{doc.full_name}</span>
                      <span className="text-[10px] text-slate-500">({doc.room_number})</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{doc.department_name} • {doc.specialization}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDoctorStatusToggle(doc.id, doc.status)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                        isAvailable 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                      }`}
                    >
                      {isAvailable ? 'Available' : 'On Break'}
                    </button>
                    <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {doc.total_patients_served} done
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* All Hospital Appointments & Queue Log (Requirement 9) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hospital Queue Registry & Status ({appointments.length})</h2>
            <p className="text-xs text-slate-500">Comprehensive patient appointment logs across all departments</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Token</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4 text-center">Pos</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 rounded-r-xl">Est. Wait Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.slice(0, 15).map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-700">{appt.token_number || '—'}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{appt.patient_name}</td>
                  <td className="py-3 px-4 text-slate-600">{appt.department_name}</td>
                  <td className="py-3 px-4 text-slate-800">{appt.doctor_name}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700">
                    {appt.queue_position ? `#${appt.queue_position}` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      appt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      appt.status === 'in_consultation' ? 'bg-emerald-100 text-emerald-800' :
                      appt.status === 'cancelled' ? 'bg-slate-100 text-slate-600' :
                      appt.status === 'no_show' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {appt.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-700">
                    {appt.status === 'completed' ? '0 min (Done)' : appt.estimated_waiting_time ? `~${appt.estimated_waiting_time} mins` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SafetyDisclaimer />

      {/* Add Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add New Doctor to Roster</h3>
              <button onClick={() => setShowDoctorModal(false)} className="text-slate-400 p-1">✕</button>
            </div>
            {formError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{formError}</div>}
            <form onSubmit={handleAddDoctor} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Doctor Name</label>
                <input
                  type="text"
                  required
                  value={docForm.full_name}
                  onChange={(e) => setDocForm({ ...docForm, full_name: e.target.value })}
                  placeholder="Dr. Alexander Wright"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={docForm.email}
                    onChange={(e) => setDocForm({ ...docForm, email: e.target.value })}
                    placeholder="dr.wright@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
                  <input
                    type="text"
                    required
                    value={docForm.password}
                    onChange={(e) => setDocForm({ ...docForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                <select
                  required
                  value={docForm.department_id}
                  onChange={(e) => setDocForm({ ...docForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none bg-white"
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    value={docForm.specialization}
                    onChange={(e) => setDocForm({ ...docForm, specialization: e.target.value })}
                    placeholder="e.g. Neurologist"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Room #</label>
                  <input
                    type="text"
                    required
                    value={docForm.room_number}
                    onChange={(e) => setDocForm({ ...docForm, room_number: e.target.value })}
                    placeholder="Room 205"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {formLoading ? 'Adding...' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Clinic Department</h3>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 p-1">✕</button>
            </div>
            {formError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{formError}</div>}
            <form onSubmit={handleAddDepartment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Dermatology"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Code</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    placeholder="DM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Base Avg Time (m)</label>
                  <input
                    type="number"
                    required
                    value={deptForm.base_consultation_time}
                    onChange={(e) => setDeptForm({ ...deptForm, base_consultation_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Clinical scope and outpatient facilities"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {formLoading ? 'Adding...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
