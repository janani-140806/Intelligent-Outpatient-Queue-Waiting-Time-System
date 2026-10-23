import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  Ticket, Clock, User, Calendar, Stethoscope, AlertTriangle, 
  CheckCircle, Plus, RefreshCw, XCircle, FileText, ChevronRight, Activity
} from 'lucide-react';
import QueueProgress from '../components/QueueProgress';
import SafetyDisclaimer from '../components/SafetyDisclaimer';

export default function PatientDashboard() {
  const { user } = useAuth();

  const [activeQueue, setActiveQueue] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('10:00 AM - 10:30 AM');
  const [symptoms, setSymptoms] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Cancel Confirmation
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 6000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [queueRes, apptsRes, deptsRes] = await Promise.all([
        api.getPatientActiveQueue(),
        api.getAppointments(),
        api.getDepartments()
      ]);

      setActiveQueue(queueRes?.has_active_token ? queueRes.item : null);
      setAppointments(apptsRes || []);
      setDepartments(deptsRes || []);
    } catch (err) {
      console.error("Error loading patient data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeptChange = async (e) => {
    const deptId = e.target.value;
    setSelectedDeptId(deptId);
    setSelectedDoctorId('');
    if (deptId) {
      try {
        const docs = await api.getDoctors(deptId);
        setDoctors(docs || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setDoctors([]);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError('');

    try {
      await api.bookAppointment({
        department_id: Number(selectedDeptId),
        doctor_id: Number(selectedDoctorId),
        appointment_date: appointmentDate,
        time_slot: timeSlot,
        symptoms: symptoms || 'General OPD consultation'
      });
      setShowBookingModal(false);
      setSymptoms('');
      loadDashboardData();
    } catch (err) {
      setBookingError(err.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment and release your queue token?")) {
      return;
    }
    try {
      setCancellingId(apptId);
      await api.cancelAppointment(apptId);
      await loadDashboardData();
    } catch (err) {
      alert(err.message || "Failed to cancel appointment");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Patient OPD Portal</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor your consultation token, review AI estimated waiting time, and manage visits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              loadDashboardData();
            }}
            className="p-2.5 text-slate-500 hover:text-sky-600 rounded-xl hover:bg-slate-100 transition-colors"
            title="Refresh Token Status"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowBookingModal(true)}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Book New Token
          </button>
        </div>
      </div>

      {/* Active Token Card (Section 7 in requirements) */}
      {activeQueue ? (
        <div className="bg-gradient-to-br from-white to-sky-50/50 rounded-3xl p-6 sm:p-8 border-2 border-sky-300/80 shadow-md space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-sky-100">
            
            {/* Token Badge */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-widest">My Active Token</span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-mono font-black text-sky-700 tracking-tight">
                  {activeQueue.token_number}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {activeQueue.status === 'in_consultation' ? 'Now Consulting' : 'Waiting in Hall'}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white/90 p-4 rounded-2xl border border-sky-100 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Queue Position</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {activeQueue.status === 'in_consultation' ? 'Active' : `#${activeQueue.queue_position}`}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {activeQueue.queue_position <= 1 ? 'You are next' : `${activeQueue.queue_position - 1} ahead`}
                </p>
              </div>

              <div className="bg-white/90 p-4 rounded-2xl border border-sky-100 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Est. Waiting Time</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-sky-600">
                    {activeQueue.status === 'in_consultation' ? '0' : `~${activeQueue.estimated_waiting_time}`}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">mins</span>
                </div>
                <p className="text-[10px] text-teal-600 font-medium mt-0.5">Random Forest ML</p>
              </div>

              <div className="bg-white/90 p-4 rounded-2xl border border-sky-100 shadow-sm col-span-2 sm:col-span-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Doctor & Room</p>
                <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                  {activeQueue.doctor_name}
                </p>
                <p className="text-xs font-medium text-slate-600 mt-0.5">
                  {activeQueue.room_number} • {activeQueue.department_name}
                </p>
              </div>
            </div>

          </div>

          {/* Visual Queue Progress Indicator (Requirement 7) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Real-Time Queue Progression
            </h3>
            <QueueProgress status={activeQueue.status} queuePosition={activeQueue.queue_position} />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500 italic">
              Please remain in the waiting lounge near {activeQueue.room_number}.
            </p>
            <button
              onClick={() => handleCancelAppointment(activeQueue.appointment_id)}
              disabled={cancellingId === activeQueue.appointment_id || activeQueue.status === 'in_consultation'}
              className="px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              Cancel Appointment
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <Ticket className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No Active Queue Token</h2>
            <p className="text-xs text-slate-500">
              You do not have an active appointment token in the hospital queue today.
            </p>
          </div>
          <button
            onClick={() => setShowBookingModal(true)}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Book OPD Appointment Now
          </button>
        </div>
      )}

      {/* Safety Notice */}
      <SafetyDisclaimer />

      {/* Previous Appointments / Visit History (Requirement 2) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Appointment History & Tokens</h2>
            <p className="text-xs text-slate-500">Log of current and past hospital OPD visits</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Appt ID</th>
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-4">Department & Doctor</th>
                <th className="py-3 px-4">Date & Slot</th>
                <th className="py-3 px-4">Symptoms</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No appointments on record.
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => {
                  const isCancelable = appt.status === 'waiting' || appt.status === 'scheduled';
                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{appt.appointment_number}</td>
                      <td className="py-3 px-4 font-mono font-bold text-sky-700">{appt.token_number || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{appt.doctor_name}</div>
                        <div className="text-[11px] text-slate-500">{appt.department_name}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{appt.appointment_date}</div>
                        <div className="text-[11px] text-slate-500">{appt.time_slot}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">
                        {appt.symptoms || 'General consult'}
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
                      <td className="py-3 px-4 text-right">
                        {isCancelable && (
                          <button
                            onClick={() => handleCancelAppointment(appt.id)}
                            disabled={cancellingId === appt.id}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Appointment Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Book OPD Token</h3>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  1. Select Department
                </label>
                <select
                  required
                  value={selectedDeptId}
                  onChange={handleDeptChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-sky-500 text-sm outline-none bg-white"
                >
                  <option value="">-- Choose Clinic Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code}) - {d.base_consultation_time} min avg
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  2. Select Doctor
                </label>
                <select
                  required
                  disabled={!selectedDeptId}
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-sky-500 text-sm outline-none bg-white disabled:bg-slate-50"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.full_name} • {doc.specialization} ({doc.room_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none bg-white"
                  >
                    <option value="09:00 AM - 09:30 AM">09:00 AM - 09:30 AM</option>
                    <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                    <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                    <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                    <option value="03:30 PM - 04:00 PM">03:30 PM - 04:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Symptoms / Reason for Visit
                </label>
                <textarea
                  rows={2}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Mild headache, viral fever symptoms, regular follow-up"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-sky-500 text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {bookingLoading ? 'Generating Token...' : 'Confirm & Generate Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
