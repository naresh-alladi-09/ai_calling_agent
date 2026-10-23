import React from 'react';
import { 
  X, 
  PhoneCall, 
  MessageSquare, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  IndianRupee, 
  Volume2, 
  Globe 
} from 'lucide-react';

export default function CallDetailModal({ call, isOpen, onClose }) {
  if (!isOpen || !call) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between bg-slate-950/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                call.outcome === 'demo_requested' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : call.outcome === 'opted_out'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {call.outcome?.replace(/_/g, ' ') || call.status}
              </span>
              <span className="text-xs text-slate-400">• Call ID: #{call.id}</span>
              <span className="text-xs text-slate-500 font-mono">({call.provider_call_id})</span>
            </div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-cyan-400" />
              <span>Lead #{call.lead_id} — Outbound Sales Pitch</span>
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {call.duration_seconds} seconds
              </span>
              <span className="flex items-center gap-1 font-mono text-emerald-400">
                <IndianRupee className="w-3.5 h-3.5" />
                ₹{call.cost_inr.toFixed(2)}
              </span>
              <span className="flex items-center gap-1 capitalize">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                {call.language_used === 'te' ? 'Telugu' : call.language_used === 'en' ? 'English' : 'Bilingual'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* AI Executive Summary */}
          {call.ai_summary && (
            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                <Sparkles className="w-4 h-4" />
                <span>AI Sales Intelligence Summary</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {call.ai_summary}
              </p>
            </div>
          )}

          {/* Detected Objections */}
          {call.detected_objections?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300">Detected Objections & Friction Points</h4>
              <div className="flex flex-wrap gap-2">
                {call.detected_objections.map((obj, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs">
                    {obj}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full Conversation Dialogue Transcript */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full Conversation Transcript</span>
            </h4>

            {call.transcript && Array.isArray(call.transcript) && call.transcript.length > 0 ? (
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-white/5">
                {call.transcript.map((msg, index) => {
                  const isAgent = msg.role === 'agent' || msg.role === 'assistant';
                  const isSystem = msg.role === 'system';

                  if (isSystem) {
                    return (
                      <div key={index} className="text-center text-[10px] text-slate-500 italic py-1">
                        {msg.text}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                    >
                      <div className="text-[10px] font-medium text-slate-500 mb-0.5 px-1">
                        {isAgent ? 'Nani (AI Sales Agent)' : 'College Faculty / Recipient'}
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                          isAgent
                            ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-tl-sm'
                            : 'bg-slate-800 text-slate-200 border border-white/10 rounded-tr-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-800/20 text-center text-xs text-slate-500">
                No transcript captured for this call.
              </div>
            )}
          </div>

          {/* Follow-up Action */}
          {call.follow_up_action && (
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Scheduled Follow-up Action:</span>
              <span className="font-semibold text-emerald-400">{call.follow_up_action}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
