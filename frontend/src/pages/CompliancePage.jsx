import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  ShieldCheck, 
  ShieldBan, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Plus, 
  RefreshCw,
  Phone,
  Clock,
  BookOpen
} from 'lucide-react';

export default function CompliancePage() {
  const [suppressed, setSuppressed] = useState([]);
  const [loading, setLoading] = useState(true);

  // Checker
  const [checkPhone, setCheckPhone] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  // Manual Add
  const [manualPhone, setManualPhone] = useState('');
  const [manualReason, setManualReason] = useState('Manual opt-out / DND request');
  const [adding, setAdding] = useState(false);

  const fetchSuppressionList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/compliance/suppression-list');
      setSuppressed(res.data);
    } catch (err) {
      console.error("Failed to load suppression list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppressionList();
  }, []);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!checkPhone.trim()) return;
    setChecking(true);
    setCheckResult(null);

    try {
      const res = await api.get(`/compliance/check?phone_number=${encodeURIComponent(checkPhone)}`);
      setCheckResult(res.data);
    } catch (err) {
      alert("Compliance check failed");
    } finally {
      setChecking(false);
    }
  };

  const handleAddSuppression = async (e) => {
    e.preventDefault();
    if (!manualPhone.trim()) return;
    setAdding(true);

    try {
      await api.post('/compliance/suppress', {
        phone_number: manualPhone,
        reason: manualReason
      });
      setManualPhone('');
      fetchSuppressionList();
      alert("Phone number successfully added to Do-Not-Call suppression list.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to add suppression");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>TRAI Compliance & Do-Not-Call (DND) Registry</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Telecom Commercial Communications Customer Preference Regulations (TCCCPR 2018) enforcement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Suppression List Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldBan className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Active Suppression List</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                  {suppressed.length} Numbers Blocked
                </span>
              </div>
              <button
                onClick={fetchSuppressionList}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Suppressed Phone</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Channel Source</th>
                    <th className="py-3 px-4 text-right">Opted Out Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400">
                        Loading suppression records...
                      </td>
                    </tr>
                  ) : suppressed.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400">
                        No active suppression records.
                      </td>
                    </tr>
                  ) : (
                    suppressed.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-semibold text-rose-400">
                          {rec.phone_number}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{rec.reason}</td>
                        <td className="py-3 px-4 text-slate-400 uppercase text-[10px]">
                          {rec.source}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                          {new Date(rec.requested_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Live Compliance Verifier & Manual Opt-Out */}
        <div className="space-y-6">
          {/* Live Phone Calling Verifier */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Verify Calling Permissibility</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Check if an Indian phone number is legally and technically eligible to call right now:
            </p>

            <form onSubmit={handleCheck} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. 9848012345 or +919848012345"
                value={checkPhone}
                onChange={(e) => setCheckPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={checking}
                className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {checking ? 'Auditing Compliance...' : 'Audit Number'}
              </button>
            </form>

            {checkResult && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
                checkResult.is_allowed 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {checkResult.is_allowed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Compliant to Call</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Calling Restricted</span>
                    </>
                  )}
                </div>
                {checkResult.reason && (
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {checkResult.reason}
                  </p>
                )}
                <div className="text-[10px] text-slate-400 pt-1 border-t border-white/10">
                  IST Hour: {checkResult.current_hour_ist}:00 • Window: {checkResult.window_start}:00 to {checkResult.window_end}:00 IST
                </div>
              </div>
            )}
          </div>

          {/* Manual Suppression Entry */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldBan className="w-4 h-4 text-rose-400" />
              <span>Manual Number Suppression</span>
            </h3>
            <form onSubmit={handleAddSuppression} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="9848099887"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Suppression Reason</label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {adding ? 'Adding...' : 'Block from Calling Queue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
