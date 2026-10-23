import React, { useState, useEffect } from 'react';
import api from '../api/client';
import CallDetailModal from '../components/CallDetailModal';
import { 
  PhoneCall, 
  Search, 
  Filter, 
  MessageSquare, 
  Clock, 
  IndianRupee, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  CalendarCheck,
  PhoneForwarded,
  ShieldBan
} from 'lucide-react';

export default function CallHistoryPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params = {};
      if (outcomeFilter) params.outcome = outcomeFilter;
      if (langFilter) params.language = langFilter;

      const res = await api.get('/calls', { params });
      setCalls(res.data);
    } catch (err) {
      console.error("Failed to load call history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [outcomeFilter, langFilter]);

  const getOutcomePill = (outcome, status) => {
    const val = outcome || status;
    const styles = {
      demo_requested: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold',
      interested: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      callback_requested: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      not_interested: 'bg-slate-700 text-slate-300 border-white/5',
      opted_out: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      in_progress: 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse',
      completed: 'bg-slate-800 text-slate-300 border-white/10',
    };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border capitalize ${styles[val] || styles.completed}`}>
        {val?.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <PhoneCall className="w-5 h-5 text-cyan-400" />
            <span>Call History & Telephony Records</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Comprehensive audit logs, transcripts, cost calculations, and AI sales intelligence
          </p>
        </div>

        <button
          onClick={fetchCalls}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
          title="Refresh calls"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm flex flex-wrap items-center gap-3">
        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">All Call Outcomes</option>
          <option value="demo_requested">Demo Requested</option>
          <option value="interested">Interested</option>
          <option value="callback_requested">Callback Scheduled</option>
          <option value="not_interested">Not Interested</option>
          <option value="opted_out">Opted Out (DND)</option>
        </select>

        <select
          value={langFilter}
          onChange={(e) => setLangFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">All Languages</option>
          <option value="te">Telugu (తెలుగు)</option>
          <option value="en">English</option>
          <option value="bilingual">Bilingual</option>
        </select>
      </div>

      {/* Call Records Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Call ID & Time</th>
                <th className="py-3.5 px-4">Lead ID</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Outcome</th>
                <th className="py-3.5 px-4">Language</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Cost (INR)</th>
                <th className="py-3.5 px-4 text-right">Transcript</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Loading call records...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 space-y-2">
                    <PhoneCall className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="font-medium">No calls recorded yet.</p>
                    <p className="text-[11px] text-slate-500">Initiate an outbound test call to view real-time transcripts and logs.</p>
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                        Call #{call.id}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(call.created_at).toLocaleString()}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      Lead #{call.lead_id}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                        {call.provider}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {getOutcomePill(call.outcome, call.status)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] text-slate-300 capitalize">
                        {call.language_used === 'te' ? 'Telugu' : call.language_used === 'en' ? 'English' : 'Bilingual'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {call.duration_seconds}s
                    </td>

                    <td className="py-3 px-4 font-mono text-emerald-400">
                      ₹{call.cost_inr.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCall(call);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 text-xs font-medium flex items-center gap-1.5 ml-auto transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Transcript</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Detail Modal */}
      <CallDetailModal
        call={selectedCall}
        isOpen={!!selectedCall}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  );
}
