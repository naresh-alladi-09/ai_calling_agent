import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  X, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  ShieldCheck, 
  PhoneCall, 
  Calendar, 
  Edit3, 
  Save, 
  Trash2, 
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function LeadDetailModal({ leadId, isOpen, onClose, onLeadUpdated, onTriggerCall }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState([]);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [statusVal, setStatusVal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && leadId) {
      loadLeadDetails();
    }
  }, [isOpen, leadId]);

  const loadLeadDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leads/${leadId}`);
      setLead(res.data);
      setNotes(res.data.notes || '');
      setStatusVal(res.data.status || 'new');

      // Fetch calls for this lead
      const callRes = await api.get(`/calls?lead_id=${leadId}`);
      setCalls(callRes.data);
    } catch (err) {
      console.error("Failed to load lead details", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !leadId) return null;

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await api.patch(`/leads/${leadId}`, {
        notes,
        status: statusVal
      });
      setEditing(false);
      onLeadUpdated();
      loadLeadDetails();
    } catch (err) {
      console.error("Failed to update lead", err);
    } finally {
      setSaving(false);
    }
  };

  const handleOptOut = async () => {
    if (window.confirm(`Opt out ${lead?.college_name}? This will block all future promotional calls.`)) {
      try {
        await api.post(`/contacts/${leadId}/opt-out`, { reason: 'Lead requested opt-out' });
        onLeadUpdated();
        loadLeadDetails();
      } catch (err) {
        console.error("Failed to opt out", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between bg-slate-950/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                lead?.is_suppressed 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : lead?.status === 'demo_requested'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {lead?.is_suppressed ? 'Suppressed (Opted Out)' : lead?.status?.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-400">• Lead ID: #{lead?.id}</span>
            </div>
            <h2 className="text-lg font-bold text-white">{lead?.college_name}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {lead?.location || 'Andhra Pradesh / Telangana'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!lead?.is_suppressed && (
              <button
                onClick={() => {
                  onClose();
                  onTriggerCall(lead);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Now</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Contact Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-800/40 border border-white/5">
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">Contact Person & Designation</div>
              <div className="text-xs font-semibold text-white">
                {lead?.contact_name} {lead?.designation && `(${lead.designation})`}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">Phone Number</div>
              <div className="text-xs font-semibold text-cyan-400 font-mono">
                {lead?.phone_number}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">Email Address</div>
              <div className="text-xs text-slate-300">
                {lead?.email || 'Not provided'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">Preferred Pitch Language</div>
              <div className="text-xs font-medium text-slate-200 capitalize">
                {lead?.preferred_language === 'te' ? 'Telugu (తెలుగు)' : lead?.preferred_language === 'en' ? 'English' : 'Auto / Bilingual'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">Consent Authorization</div>
              <div className="text-xs text-slate-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="capitalize">{lead?.consent_status?.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">Calling Attempts</div>
              <div className="text-xs font-semibold text-white">
                {lead?.call_attempts} attempts {lead?.last_called_at && `(Last: ${new Date(lead.last_called_at).toLocaleDateString()})`}
              </div>
            </div>
          </div>

          {/* CRM Status & Notes Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Lead Status & Outreach Notes</span>
              </label>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  Edit Notes
                </button>
              ) : (
                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3 h-3" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                >
                  <option value="new">New</option>
                  <option value="interested">Interested</option>
                  <option value="demo_requested">Demo Requested</option>
                  <option value="callback_requested">Callback Requested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="opted_out">Opted Out</option>
                </select>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Record insights, faculty comments, or demo preferences..."
                />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-800/30 border border-white/5 text-xs text-slate-300 leading-relaxed min-h-[50px]">
                {lead?.notes || <span className="text-slate-500 italic">No notes recorded yet.</span>}
              </div>
            )}
          </div>

          {/* Past Calls for this Lead */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Call History ({calls.length})</span>
            </h4>

            {calls.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-800/20 text-center text-xs text-slate-500">
                No calls attempted for this lead yet.
              </div>
            ) : (
              <div className="space-y-2">
                {calls.map((call) => (
                  <div key={call.id} className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">Call #{call.id}</span>
                        <span className="text-slate-400 font-mono">({call.duration_seconds}s)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">
                          {call.language_used}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(call.created_at).toLocaleString()}
                      </span>
                    </div>
                    {call.ai_summary && (
                      <p className="text-[11px] text-slate-300 italic">"{call.ai_summary}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40 flex items-center justify-between">
          {!lead?.is_suppressed ? (
            <button
              onClick={handleOptOut}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
            >
              Enforce Opt-Out & Add to DND
            </button>
          ) : (
            <span className="text-xs text-rose-400">Contact permanently opted out</span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
