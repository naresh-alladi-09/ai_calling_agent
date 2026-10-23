import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  Sliders, 
  PhoneCall, 
  ShieldCheck, 
  Cpu, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Globe
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    calling_mode: 'demo',
    permitted_hours_start: 9,
    permitted_hours_end: 20,
    max_daily_budget: 1000.0,
    telephony_provider: 'simulated',
    voice_provider: 'sarvam',
    default_llm_model: 'gpt-4o-mini'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/settings');
        setSettings(res.data);
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await api.patch('/settings', settings);
      setSettings(res.data);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <span>Telephony & AI Configuration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure Indian cloud telephony adapters, bilingual speech synthesis, and TRAI calling boundaries
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Application settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Environment Mode Switch */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-blue-400" />
            <span>Operating Environment Mode</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              onClick={() => setSettings({ ...settings, calling_mode: 'demo', telephony_provider: 'simulated' })}
              className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                settings.calling_mode === 'demo'
                  ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                  : 'bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-blue-400">DEMO MODE (Safe Sandbox)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Zero Cost</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Interactive real-time browser sandbox. Ideal for testing bilingual conversation, Telugu objections, and qualification without placing real phone calls.
                </p>
              </div>
            </label>

            <label
              onClick={() => setSettings({ ...settings, calling_mode: 'live', telephony_provider: 'exotel' })}
              className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                settings.calling_mode === 'live'
                  ? 'bg-rose-600/15 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                  : 'bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-rose-400">LIVE CARRIER CALLING</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">Real Telecom</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Connects to Indian cloud telephony (Exotel) to place genuine outbound telephone calls to college faculty numbers with DLT principal registration.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Speech & AI Model Settings */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>AI Voice & Speech Engines</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Bilingual Voice Provider</label>
              <select
                value={settings.voice_provider}
                onChange={(e) => setSettings({ ...settings, voice_provider: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
              >
                <option value="sarvam">Sarvam AI (Native Telugu + Indian English)</option>
                <option value="elevenlabs">ElevenLabs (Multilingual Indian Voice)</option>
                <option value="browser">Browser WebSpeech (Zero Config)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">LLM Conversation Model</label>
              <select
                value={settings.default_llm_model}
                onChange={(e) => setSettings({ ...settings, default_llm_model: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
              >
                <option value="gpt-4o-mini">OpenAI GPT-4o-mini (Fast & Cost Effective)</option>
                <option value="gpt-4o">OpenAI GPT-4o (Deep Reasoning)</option>
              </select>
            </div>
          </div>
        </div>

        {/* TRAI Commercial Calling Window & Budget */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>TRAI Regulatory Window & Cost Limits</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Start Hour (IST)</label>
              <input
                type="number"
                min="9"
                max="12"
                value={settings.permitted_hours_start}
                onChange={(e) => setSettings({ ...settings, permitted_hours_start: parseInt(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">TRAI mandated 9:00 AM IST</span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">End Hour (IST)</label>
              <input
                type="number"
                min="18"
                max="20"
                value={settings.permitted_hours_end}
                onChange={(e) => setSettings({ ...settings, permitted_hours_end: parseInt(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">TRAI mandated 8:00 PM IST</span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Max Daily Budget (INR)</label>
              <input
                type="number"
                min="100"
                step="50"
                value={settings.max_daily_budget}
                onChange={(e) => setSettings({ ...settings, max_daily_budget: parseFloat(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/10 text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Hard ceiling on telecom costs</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
