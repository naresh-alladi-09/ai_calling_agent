import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Building2,
  CalendarCheck
} from 'lucide-react';

export default function DemosPage() {
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDemos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/demos', { params });
      setDemos(res.data);
    } catch (err) {
      console.error("Failed to load demo bookings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemos();
  }, [statusFilter]);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/demos/${id}`, { status: newStatus });
      fetchDemos();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            <span>Scheduled Product Demonstrations</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              {demos.length} Bookings
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            College administration and faculty walk-throughs arranged by Nani AI Calling Agent
          </p>
        </div>

        <button
          onClick={fetchDemos}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Scheduled Demos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            Loading demo bookings...
          </div>
        ) : demos.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400 p-8 rounded-2xl bg-slate-900/60 border border-white/10">
            <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-white">No demo bookings scheduled yet.</p>
            <p className="text-slate-500 mt-1">
              Engage college leads in the Voice Sandbox or Campaigns to secure online product demonstrations.
            </p>
          </div>
        ) : (
          demos.map((demo) => (
            <div
              key={demo.id}
              className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    demo.status === 'completed'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : demo.status === 'cancelled'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {demo.status}
                  </span>
                  <span className="text-xs text-slate-500">Booking #{demo.id}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>{demo.contact_name}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{demo.contact_phone}</div>
                  {demo.contact_email && (
                    <div className="text-xs text-slate-400">{demo.contact_email}</div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Scheduled Date: <strong>{demo.scheduled_date}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scheduled Time: <strong>{demo.scheduled_time}</strong></span>
                  </div>
                </div>

                {demo.requirements_notes && (
                  <div className="p-3 rounded-xl bg-slate-950/40 text-[11px] text-slate-300 italic border border-white/5">
                    "{demo.requirements_notes}"
                  </div>
                )}
              </div>

              {/* Status Update Actions */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Created {new Date(demo.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1.5">
                  {demo.status !== 'completed' && (
                    <button
                      onClick={() => updateStatus(demo.id, 'completed')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                    >
                      Completed
                    </button>
                  )}
                  {demo.status !== 'cancelled' && (
                    <button
                      onClick={() => updateStatus(demo.id, 'cancelled')}
                      className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
