import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck, Stethoscope, User } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'doctor') navigate('/doctor');
      else navigate('/patient');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demoEmail, demoPw) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Portal Login</h2>
          <p className="text-xs text-slate-500">Access your appointments, live queue token, or clinical workbench</p>
        </div>

        {/* Demo Quick-Select Buttons */}
        <div className="bg-sky-50/70 border border-sky-200/70 rounded-2xl p-4 space-y-2">
          <p className="text-[11px] font-bold text-sky-900 uppercase tracking-wider text-center">
            Examiner / Demo Quick Access
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDemoAccount('john.doe@example.com', 'patient123')}
              className="px-2.5 py-2 rounded-xl bg-white border border-sky-200 text-sky-800 text-xs font-semibold hover:bg-sky-100/50 shadow-sm transition-all flex flex-col items-center gap-1"
            >
              <User className="w-4 h-4 text-sky-600" />
              Patient
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('dr.rajesh@hospital.com', 'doctor123')}
              className="px-2.5 py-2 rounded-xl bg-white border border-teal-200 text-teal-800 text-xs font-semibold hover:bg-teal-100/50 shadow-sm transition-all flex flex-col items-center gap-1"
            >
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Doctor
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('admin@hospital.com', 'admin123')}
              className="px-2.5 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-800 text-xs font-semibold hover:bg-indigo-100/50 shadow-sm transition-all flex flex-col items-center gap-1"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Admin
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              New patient?{' '}
              <Link to="/register" className="font-semibold text-sky-600 hover:underline">
                Create patient account & book token
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
