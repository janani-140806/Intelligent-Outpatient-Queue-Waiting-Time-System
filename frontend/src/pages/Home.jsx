import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { 
  Users, Clock, UserCheck, Stethoscope, Sparkles, Filter, 
  RefreshCw, CheckCircle2, ArrowRight, ShieldAlert, HeartPulse, Building2
} from 'lucide-react';
import StatCard from '../components/StatCard';
import SafetyDisclaimer from '../components/SafetyDisclaimer';

export default function Home() {
  const [queue, setQueue] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [queueData, deptsData, overviewData] = await Promise.all([
        api.getQueue(),
        api.getDepartments(),
        api.getAdminOverview()
      ]);
      setQueue(queueData || []);
      setDepartments(deptsData || []);
      setOverview(overviewData || null);
    } catch (err) {
      console.error("Error loading queue data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredQueue = selectedDept === 'ALL'
    ? queue
    : queue.filter(item => item.department_id === Number(selectedDept));

  // Mask patient name for HIPAA/GDPR simulated privacy on public screen
  const maskName = (name) => {
    if (!name) return "Patient";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return name;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-900 via-sky-800 to-teal-900 text-white p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Driven Queue Prediction • Academic Healthcare System
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Intelligent Outpatient Queue & Waiting-Time System
          </h1>
          <p className="text-sky-100 text-sm sm:text-base leading-relaxed max-w-2xl">
            Streamlining hospital patient flow with machine learning waiting-time estimation. Track real-time token progression, doctor status, and clinic workload dynamically.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-white text-sky-900 font-bold text-sm shadow-md hover:bg-sky-50 transition-all flex items-center gap-2"
            >
              Book OPD Appointment
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/ai-presentation"
              className="px-5 py-2.5 rounded-xl bg-sky-700/60 hover:bg-sky-700 text-white font-semibold text-sm border border-sky-400/30 transition-all flex items-center gap-2"
            >
              <HeartPulse className="w-4 h-4 text-sky-300" />
              Explore ML Prediction Model
            </Link>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      </div>

      {/* Overview Stat Cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Patients Waiting"
            value={overview.waiting_patients}
            subtitle="Active in OPD halls"
            icon={Users}
            color="amber"
          />
          <StatCard
            title="Currently Consulting"
            value={overview.consulting_patients}
            subtitle="In examination rooms"
            icon={Stethoscope}
            color="emerald"
          />
          <StatCard
            title="Avg Predicted Wait"
            value={overview.avg_waiting_time}
            unit="min"
            subtitle="Calculated by Random Forest"
            icon={Clock}
            color="sky"
          />
          <StatCard
            title="Available Doctors"
            value={`${overview.available_doctors}/${overview.total_doctors}`}
            subtitle="On duty across departments"
            icon={UserCheck}
            color="teal"
          />
        </div>
      )}

      {/* Live Public OPD Queue Board */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Live Outpatient Queue Board</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Real-time status of hospital consulting rooms and waiting tokens</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setSelectedDept('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  selectedDept === 'ALL' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Departments
              </button>
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.id.toString())}
                  className={`px-3 py-1.5 rounded-lg transition-colors hidden md:inline-block ${
                    selectedDept === dept.id.toString() ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {dept.name}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2 text-slate-500 hover:text-sky-600 rounded-xl hover:bg-slate-100 transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Token #</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Doctor & Room</th>
                <th className="py-3 px-4 text-center">Queue Pos</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 rounded-r-xl">Est. Waiting Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    No active patients in queue for this selection.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => {
                  const isConsulting = item.status === 'in_consultation';
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isConsulting ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-700 text-base">
                        {item.token_number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {maskName(item.patient_name)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                        {item.department_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs">{item.doctor_name}</div>
                        <div className="text-[11px] text-slate-500">{item.room_number}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isConsulting ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="font-bold text-slate-700">#{item.queue_position}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isConsulting ? 'badge-consulting' : 'badge-waiting'
                          }`}
                        >
                          {isConsulting ? 'In Consultation' : 'Waiting in Hall'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isConsulting ? (
                          <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            Consulting Now
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                            <Clock className="w-3.5 h-3.5 text-sky-600" />
                            <span>~{item.estimated_waiting_time} mins</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Safety Disclaimer Banner */}
        <SafetyDisclaimer />
      </div>

    </div>
  );
}
