import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PhoneCall, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Sparkles, CheckCircle, WifiOff } from 'lucide-react';
import api from '../api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'connected' | 'disconnected' | 'checking'

  const checkBackend = async () => {
    try {
      await api.get('/health');
      setBackendStatus('connected');
    } catch (err) {
      setBackendStatus('disconnected');
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to backend server at http://127.0.0.1:8000. Please start the backend with run_backend.bat or check that Uvicorn is running.');
        setBackendStatus('disconnected');
      } else {
        setError(err.response?.data?.detail || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const autofillAdmin = () => {
    setEmail('admin@nani-caller.ai');
    setPassword('Admin@123456');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/15 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 shadow-xl shadow-blue-500/20 mb-2">
            <PhoneCall className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Nani AI Sales Caller
          </h1>
          <p className="text-xs text-slate-400">
            Bilingual Voice Calling Agent • Student Management System Sales
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Owner Portal Authentication</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              TRAI & DLT Compliant
            </span>
          </div>

          {/* Backend Connection Status Indicator */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-800/60 border border-white/5 text-[11px]">
            <span className="text-slate-400">FastAPI Backend (127.0.0.1:8000):</span>
            <button
              type="button"
              onClick={checkBackend}
              title="Click to re-check backend connectivity"
              className="flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${
                backendStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : backendStatus === 'disconnected' ? 'bg-rose-500' : 'bg-amber-400'
              }`} />
              <span className={backendStatus === 'connected' ? 'text-emerald-400' : backendStatus === 'disconnected' ? 'text-rose-400 hover:underline' : 'text-amber-400'}>
                {backendStatus === 'connected' ? 'Connected' : backendStatus === 'disconnected' ? 'Offline (Click to retry)' : 'Checking...'}
              </span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@nani-caller.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Autofill */}
          <div className="pt-2 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={autofillAdmin}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autofill Default Admin Credentials</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
