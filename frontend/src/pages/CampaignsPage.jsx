import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  Megaphone, 
  Plus, 
  Play, 
  Pause, 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  Users, 
  SlidersHorizontal 
} from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: 'Andhra Pradesh Engineering Colleges Outreach',
    preferred_language: 'te',
    max_concurrent_calls: 2,
    max_retries: 3,
    retry_interval_minutes: 60,
    window_start_hour: 9,
    window_end_hour: 20
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/campaigns');
      setCampaigns(res.data);
    } catch (err) {
      console.error("Failed to load campaigns", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleStartCampaign = async (id) => {
    try {
      await api.post(`/campaigns/${id}/start`);
      fetchCampaigns();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not start campaign");
    }
  };

  const handlePauseCampaign = async (id) => {
    try {
      await api.post(`/campaigns/${id}/pause`);
      fetchCampaigns();
    } catch (err) {
      alert("Could not pause campaign");
    }
  };

  const handleEmergencyStop = async () => {
    if (window.confirm("GLOBAL EMERGENCY STOP: Immediately halt all outbound campaigns and cease all dialing?")) {
      try {
        const res = await api.post('/campaigns/emergency-stop');
        alert(res.data.message);
        fetchCampaigns();
      } catch (err) {
        alert("Emergency stop failed");
      }
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/campaigns', newCampaign);
      setIsCreateOpen(false);
      fetchCampaigns();
    } catch (err) {
      alert("Failed to create campaign");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-5 h-5 text-blue-500" />
            <span>Outbound Calling Campaigns</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Rate-limited, TRAI-compliant automated calling queues with conservative concurrency
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleEmergencyStop}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Global Emergency Stop</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
            Loading outbound campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400 p-8 rounded-2xl bg-slate-900/60 border border-white/10">
            <Megaphone className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-white">No campaigns created yet.</p>
            <p className="text-slate-500 mt-1">Create an outbound campaign to automate calls across eligible colleges.</p>
          </div>
        ) : (
          campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-4 hover:border-white/20 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    camp.status === 'running'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                      : camp.status === 'paused'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : camp.status === 'stopped'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {camp.status}
                  </span>
                  <span className="text-xs text-slate-500">ID #{camp.id}</span>
                </div>

                <h3 className="text-base font-bold text-white leading-snug">
                  {camp.name}
                </h3>

                <div className="space-y-2 text-xs text-slate-300 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Leads:</span>
                    <strong className="text-white">{camp.total_leads} Colleges</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Concurrency:</span>
                    <span className="font-mono text-cyan-400">{camp.max_concurrent_calls} simultaneous calls</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Permitted Hours:</span>
                    <span className="text-slate-200">{camp.window_start_hour}:00 - {camp.window_end_hour}:00 IST</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Primary Language:</span>
                    <span className="capitalize">{camp.preferred_language === 'te' ? 'Telugu' : 'English / Auto'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                {camp.status !== 'running' ? (
                  <button
                    onClick={() => handleStartCampaign(camp.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Campaign</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handlePauseCampaign(camp.id)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/30 cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </button>
                )}
                <span className="text-[11px] text-slate-500">
                  {new Date(camp.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Campaign Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Create New Outbound Campaign</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Preferred Language</label>
                  <select
                    value={newCampaign.preferred_language}
                    onChange={(e) => setNewCampaign({ ...newCampaign, preferred_language: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
                  >
                    <option value="te">Telugu (తెలుగు)</option>
                    <option value="en">English</option>
                    <option value="auto">Auto / Bilingual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Concurrency Limit (Max 5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newCampaign.max_concurrent_calls}
                    onChange={(e) => setNewCampaign({ ...newCampaign, max_concurrent_calls: parseInt(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Window Start (IST)</label>
                  <input
                    type="number"
                    min="9"
                    max="19"
                    value={newCampaign.window_start_hour}
                    onChange={(e) => setNewCampaign({ ...newCampaign, window_start_hour: parseInt(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Window End (IST)</label>
                  <input
                    type="number"
                    min="10"
                    max="20"
                    value={newCampaign.window_end_hour}
                    onChange={(e) => setNewCampaign({ ...newCampaign, window_end_hour: parseInt(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
