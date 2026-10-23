import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  Stethoscope, Clock, Users, Play, CheckCircle, SkipForward, 
  FileText, Pill, RefreshCw, AlertCircle, Sparkles, Building, UserCheck
} from 'lucide-react';
import StatCard from '../components/StatCard';
import SafetyDisclaimer from '../components/SafetyDisclaimer';

export default function DoctorDashboard() {
  const { user } = useAuth();

  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState(null);

  // Complete consultation modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeItemToComplete, setActiveItemToComplete] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDoctorQueue();
    const interval = setInterval(loadDoctorQueue, 6000);
    return () => clearInterval(interval);
  }, [user]);

  const loadDoctorQueue = async () => {
    if (!user) return;
    try {
      // Find doctor id: if user.doctor_id is set use it, or fetch all doctors and find by user_id
      let docId = user.doctor_id;
      if (!docId) {
        const allDocs = await api.getDoctors();
        const me = allDocs.find(d => d.user_id === user.id);
        if (me) docId = me.id;
      }

      if (docId) {
        const data = await api.getDoctorQueue(docId);
        setQueueData(data);
        setDoctorInfo(data?.doctor);
      }
    } catch (err) {
      console.error("Error loading doctor queue:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartConsultation = async (queueId) => {
    try {
      setActionLoading(true);
      await api.startConsultation(queueId);
      await loadDoctorQueue();
    } catch (err) {
      alert(err.message || "Failed to start consultation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCompleteModal = (item) => {
    setActiveItemToComplete(item);
    setDiagnosis('Routine assessment completed. Patient stable.');
    setPrescription('');
    setClinicalNotes('');
    setShowCompleteModal(true);
  };

  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    if (!activeItemToComplete) return;

    try {
      setActionLoading(true);
      await api.completeConsultation(activeItemToComplete.id, {
        diagnosis,
        prescription,
        notes: clinicalNotes
      });
      setShowCompleteModal(false);
      await loadDoctorQueue();
    } catch (err) {
      alert(err.message || "Failed to complete consultation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkipPatient = async (queueId) => {
    if (!window.confirm("Mark this patient as skipped (No-show)? They can approach reception to be re-queued.")) {
      return;
    }
    try {
      setActionLoading(true);
      await api.skipPatient(queueId);
      await loadDoctorQueue();
    } catch (err) {
      alert(err.message || "Failed to skip patient");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (newStatus) => {
    if (!doctorInfo) return;
    try {
      await api.updateDoctorStatus(doctorInfo.id, { status: newStatus });
      await loadDoctorQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const currentPatient = queueData?.current_patient;
  const waitingQueue = queueData?.waiting_queue || [];
  const nextPatient = waitingQueue.length > 0 ? waitingQueue[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Doctor OPD Workbench</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            {user?.full_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {doctorInfo?.department || "Department"} • {doctorInfo?.room_number || "Examination Suite"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => handleToggleStatus('available')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                doctorInfo?.status === 'available' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => handleToggleStatus('on_break')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                doctorInfo?.status === 'on_break' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              On Break
            </button>
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              loadDoctorQueue();
            }}
            className="p-2.5 text-slate-500 hover:text-teal-600 rounded-xl hover:bg-slate-100 transition-colors"
            title="Refresh OPD Queue"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards (Requirement 8) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Patients In Queue"
          value={queueData?.waiting_count || 0}
          subtitle="Waiting in hall"
          icon={Users}
          color="amber"
        />
        <StatCard
          title="Remaining Queue Est."
          value={queueData?.estimated_remaining_queue_time || 0}
          unit="min"
          subtitle="AI Predicted Workload"
          icon={Clock}
          color="sky"
        />
        <StatCard
          title="Today's Completed"
          value={queueData?.completed_today || 0}
          subtitle="Consultations finalized"
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Consulting Status"
          value={currentPatient ? "Active" : "Ready"}
          subtitle={currentPatient ? `Examining ${currentPatient.token_number}` : "Awaiting next"}
          icon={Stethoscope}
          color="teal"
        />
      </div>

      {/* Current Patient & Next Patient Grid (Section 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CURRENT PATIENT CARD */}
        <div className="bg-white rounded-3xl p-6 border-2 border-emerald-300 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="font-bold text-slate-900 text-base">Current Patient in Examination</h2>
            </div>
            {currentPatient && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                {currentPatient.token_number}
              </span>
            )}
          </div>

          {currentPatient ? (
            <div className="space-y-4">
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      {currentPatient.patient_name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Token: <span className="font-mono font-bold text-emerald-800">{currentPatient.token_number}</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold">
                    In Consultation
                  </span>
                </div>

                <div className="pt-2 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Consultation Start: </span>
                  {currentPatient.actual_consultation_start
                    ? new Date(currentPatient.actual_consultation_start).toLocaleTimeString()
                    : 'Just started'}
                </div>
              </div>

              {/* Consultation Control Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleOpenCompleteModal(currentPatient)}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete Consultation
                </button>
                <button
                  onClick={() => handleSkipPatient(currentPatient.id)}
                  disabled={actionLoading}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Mark as skipped / no-show"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">No Patient in Room</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Call the next waiting patient from the queue below to start consultation.
                </p>
              </div>
              {nextPatient && (
                <button
                  onClick={() => handleStartConsultation(nextPatient.id)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Call Next: {nextPatient.token_number} ({nextPatient.patient_name})
                </button>
              )}
            </div>
          )}
        </div>

        {/* NEXT UP PATIENT PREVIEW */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Up Next in Queue</h2>
            <span className="text-xs text-slate-500 font-medium">Position #1 Waiting</span>
          </div>

          {nextPatient ? (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold text-slate-900">
                      {nextPatient.patient_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-sky-100 text-sky-800">
                      {nextPatient.token_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Waiting time estimate: <span className="font-semibold text-slate-700">~{nextPatient.estimated_waiting_time} mins</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {!currentPatient && (
                  <button
                    onClick={() => handleStartConsultation(nextPatient.id)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Start Consultation
                  </button>
                )}
                <button
                  onClick={() => handleSkipPatient(nextPatient.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Skip Patient
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No upcoming patients waiting in queue.
            </div>
          )}
        </div>

      </div>

      {/* Waiting Queue Table for Doctor */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Waiting Patients Queue ({waitingQueue.length})</h2>
            <p className="text-xs text-slate-500">Upcoming appointments scheduled for today's session</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Pos</th>
                <th className="py-3 px-4">Token #</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">AI Est. Waiting</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {waitingQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    Queue is clear. No waiting patients.
                  </td>
                </tr>
              ) : (
                waitingQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-700">#{item.queue_position}</td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">{item.token_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{item.patient_name}</td>
                    <td className="py-3 px-4">
                      <span className="badge-waiting px-2.5 py-0.5 rounded-full text-xs font-bold">
                        Waiting
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      ~{item.estimated_waiting_time} mins
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {!currentPatient && item.queue_position === 1 && (
                        <button
                          onClick={() => handleStartConsultation(item.id)}
                          disabled={actionLoading}
                          className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                        >
                          Start
                        </button>
                      )}
                      <button
                        onClick={() => handleSkipPatient(item.id)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                      >
                        Skip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SafetyDisclaimer />

      {/* Complete Consultation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  Complete Consultation: {activeItemToComplete?.token_number}
                </h3>
              </div>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteConsultation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Diagnosis / Clinical Findings
                </label>
                <textarea
                  required
                  rows={2}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute upper respiratory infection, mild viral pharyngitis"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Prescription / Medications
                </label>
                <textarea
                  rows={2}
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg TDS x 3 days, Vitamin C 500mg daily"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Follow-Up & Advice
                </label>
                <input
                  type="text"
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="e.g. Hydration advised. Follow up in 5 days if fever persists."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Finalizing...' : 'Save & Advance Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
