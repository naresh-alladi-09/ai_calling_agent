import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  Upload,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Download,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  AlertTriangle,
  UserCheck,
  Building2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Info,
  ExternalLink,
  Bot,
  User,
  Zap,
  Activity,
  Radio,
  Key,
  Settings,
  HelpCircle,
  Send,
  Smartphone
} from 'lucide-react';

// Web Audio synthesizer for phone sound effects (Zero external files needed, 100% Free)
class PhoneAudioSynth {
  constructor() {
    this.ctx = null;
    this.ringInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playRing() {
    this.init();
    if (!this.ctx) return;
    this.stopRing();

    const ringOnce = () => {
      try {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 1.2);
        osc2.stop(this.ctx.currentTime + 1.2);
      } catch (e) {
        // audio error ignored
      }
    };

    ringOnce();
    this.ringInterval = setInterval(ringOnce, 2200);
  }

  stopRing() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  playConnect() {
    this.init();
    if (!this.ctx) return;
    this.stopRing();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }

  playHangup() {
    this.init();
    if (!this.ctx) return;
    this.stopRing();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }
}

const audioSynth = new PhoneAudioSynth();

export default function AutoDialerPage() {
  const [leads, setLeads] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isDialing, setIsDialing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceAudioEnabled, setVoiceAudioEnabled] = useState(true);
  const [dialSpeed, setDialSpeed] = useState('live'); // 'live' (turn-by-turn speech) or 'turbo' (fast)
  const [forcedOutcome, setForcedOutcome] = useState('auto'); // 'auto', 'demo_requested', 'callback_requested', 'not_interested'
  
  // Real calling vs Simulation mode
  const [callingMode, setCallingMode] = useState('simulated'); // 'simulated' or 'real'
  const [telephonyProvider, setTelephonyProvider] = useState('twilio'); // 'twilio' or 'exotel'
  const [showCarrierSettings, setShowCarrierSettings] = useState(false);
  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: '',
    authToken: '',
    fromNumber: ''
  });

  // Direct single phone test calling
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [testCallStatus, setTestCallStatus] = useState(null);

  // Active call state
  const [activeCallStage, setActiveCallStage] = useState('idle'); // 'idle', 'ringing', 'connected', 'ended'
  const [currentLead, setCurrentLead] = useState(null);
  const [currentTranscript, setCurrentTranscript] = useState([]);
  const [callTimer, setCallTimer] = useState(0);
  const [lastOutcome, setLastOutcome] = useState(null);

  // Completed results history
  const [results, setResults] = useState([]);
  const [selectedTranscriptLead, setSelectedTranscriptLead] = useState(null);

  // Upload UI state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Execution control refs
  const stopRequestedRef = useRef(false);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  // Timer interval ref
  const timerIntervalRef = useRef(null);

  // Load saved Twilio credentials from localStorage & load sample leads initially
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nani_twilio_config');
      if (saved) {
        setTwilioConfig(JSON.parse(saved));
      }
    } catch (e) {}

    loadSampleLeads();
    return () => {
      audioSynth.stopRing();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const saveTwilioCredentials = (newConfig) => {
    setTwilioConfig(newConfig);
    try {
      localStorage.setItem('nani_twilio_config', JSON.stringify(newConfig));
    } catch (e) {}
  };

  // Web Speech API helper
  const speakText = (text, lang) => {
    if (!voiceAudioEnabled || !window.speechSynthesis) return Promise.resolve();
    return new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.lang = lang === 'te' ? 'te-IN' : 'en-IN';
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        resolve();
      }
    });
  };

  // 1-Click Load Sample Leads from Backend
  const loadSampleLeads = async () => {
    try {
      const res = await api.get('/auto-dialer/sample-leads');
      if (res.data && res.data.length > 0) {
        setLeads(res.data.map(l => ({ ...l, call_status: 'pending' })));
        setUploadError(null);
      }
    } catch (err) {
      console.warn("Could not fetch sample leads from server, using built-in defaults");
      setLeads([
        {
          id: 1,
          college_name: "JNTUH College of Engineering",
          contact_name: "Dr. K. Srinivas Rao",
          designation: "Dean of Academics",
          phone_number: "+919849012345",
          email: "principal@jntuh.ac.in",
          preferred_language: "te",
          call_status: "pending"
        },
        {
          id: 2,
          college_name: "Chaitanya Bharathi Institute of Technology",
          contact_name: "Prof. P. Ravinder Reddy",
          designation: "Principal",
          phone_number: "+919701045678",
          email: "dean@cbit.ac.in",
          preferred_language: "en",
          call_status: "pending"
        },
        {
          id: 3,
          college_name: "VNR Vignana Jyothi Institute",
          contact_name: "Dr. B. Govinda Rao",
          designation: "Head of Dept (CSE)",
          phone_number: "+919440189012",
          email: "hod_cse@vnrvjiet.ac.in",
          preferred_language: "te",
          call_status: "pending"
        },
        {
          id: 4,
          college_name: "Andhra University College of Engg",
          contact_name: "Prof. M. Venkateswarlu",
          designation: "Vice Principal",
          phone_number: "+919885067890",
          email: "viceprincipal@au.edu.in",
          preferred_language: "te",
          call_status: "pending"
        },
        {
          id: 5,
          college_name: "Osmania University Tech Campus",
          contact_name: "Dr. S. Radhika",
          designation: "Controller of Examinations",
          phone_number: "+919490134567",
          email: "coe@osmania.ac.in",
          preferred_language: "en",
          call_status: "pending"
        }
      ]);
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = async () => {
    try {
      const res = await api.get('/auto-dialer/sample-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample_clients_for_calling.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download sample CSV template");
    }
  };

  // CSV File Upload Handler
  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setUploadError("Please upload a valid CSV file (.csv)");
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/auto-dialer/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.leads) {
        const parsed = res.data.leads.map(l => ({ ...l, call_status: 'pending' }));
        setLeads(parsed);
        setCurrentIndex(-1);
        setResults([]);
        setUploadLoading(false);
      }
    } catch (err) {
      setUploadLoading(false);
      const msg = err.response?.data?.detail || "Error parsing CSV file. Please check column headers.";
      setUploadError(msg);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Sleep utility
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Direct Real Phone Call Test
  const handleTestRealPhoneCall = async () => {
    if (!testPhoneNumber) {
      alert("Please enter a mobile phone number to test (e.g. +919876543210)");
      return;
    }
    if (telephonyProvider === 'twilio' && (!twilioConfig.accountSid || !twilioConfig.authToken)) {
      alert("Please enter your Twilio Account SID and Auth Token below first!");
      setShowCarrierSettings(true);
      return;
    }

    setIsTestingCall(true);
    setTestCallStatus({ state: 'calling', message: `Placing outbound call to ${testPhoneNumber}...` });

    try {
      const res = await api.post('/auto-dialer/test-real-call', {
        phone_number: testPhoneNumber,
        telephony_provider: telephonyProvider,
        account_sid: twilioConfig.accountSid,
        auth_token: twilioConfig.authToken,
        from_number: twilioConfig.fromNumber,
        preferred_language: 'te'
      });

      if (res.data.success) {
        setTestCallStatus({
          state: 'success',
          message: `Ring initiated! Call SID: ${res.data.provider_call_id}. Your phone should ring shortly.`
        });
      } else {
        setTestCallStatus({
          state: 'error',
          message: res.data.error || 'Carrier returned an error initiating the call.'
        });
      }
    } catch (err) {
      setTestCallStatus({
        state: 'error',
        message: err.response?.data?.detail || err.message || 'Call failed to reach carrier gateway.'
      });
    } finally {
      setIsTestingCall(false);
    }
  };

  // Run a single outbound call
  const callSingleLead = async (lead) => {
    setCurrentLead(lead);
    setActiveCallStage('ringing');
    setCurrentTranscript([]);
    setCallTimer(0);
    setLastOutcome(null);

    if (voiceAudioEnabled && callingMode === 'simulated') {
      audioSynth.playRing();
    }

    // Start timer display
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setCallTimer(t => t + 1);
    }, 1000);

    // Ringing delay
    const ringTime = dialSpeed === 'turbo' ? 400 : 2000;
    await sleep(ringTime);

    if (stopRequestedRef.current) {
      audioSynth.stopRing();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setActiveCallStage('idle');
      return null;
    }

    // Call connected!
    if (voiceAudioEnabled && callingMode === 'simulated') {
      audioSynth.playConnect();
    }
    setActiveCallStage('connected');

    // Request backend to execute dialogue & pitch student management system
    let callData = null;
    try {
      const payload = {
        lead_id: lead.id,
        contact_name: lead.contact_name,
        college_name: lead.college_name,
        phone_number: lead.phone_number,
        designation: lead.designation,
        preferred_language: lead.preferred_language || 'te',
        email: lead.email,
        forced_outcome: forcedOutcome === 'auto' ? null : forcedOutcome,
        calling_mode: callingMode,
        telephony_provider: telephonyProvider,
        twilio_account_sid: twilioConfig.accountSid,
        twilio_auth_token: twilioConfig.authToken,
        twilio_from_number: twilioConfig.fromNumber
      };
      const res = await api.post('/auto-dialer/dial-lead', payload);
      callData = res.data;
    } catch (err) {
      console.error("Dial API error", err);
      callData = {
        success: false,
        contact_name: lead.contact_name,
        college_name: lead.college_name,
        phone_number: lead.phone_number,
        outcome: 'failed',
        is_demo_booked: false,
        duration_seconds: 5,
        transcript: [{ role: 'system', text: 'Call failed to connect to network carrier pulse', timestamp: '00:00' }],
        ai_summary: 'Network carrier connection error'
      };
    }

    // Render dialogue turns
    const dialogueTurns = callData.transcript || [];
    const displayedTurns = [];

    for (let i = 0; i < dialogueTurns.length; i++) {
      if (stopRequestedRef.current) break;

      while (isPausedRef.current) {
        await sleep(500);
      }

      const turn = dialogueTurns[i];
      displayedTurns.push(turn);
      setCurrentTranscript([...displayedTurns]);

      if (dialSpeed === 'live') {
        if (voiceAudioEnabled && callingMode === 'simulated' && turn.role !== 'system') {
          await speakText(turn.text, lead.preferred_language);
        } else {
          await sleep(1400);
        }
      } else {
        await sleep(150);
      }
    }

    // Finish call
    if (voiceAudioEnabled && callingMode === 'simulated') {
      audioSynth.playHangup();
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    setActiveCallStage('ended');
    setLastOutcome(callData);

    // Save into results list
    const resultItem = {
      id: callData.call_id || Date.now(),
      lead_id: lead.id,
      contact_name: lead.contact_name,
      college_name: lead.college_name,
      phone_number: lead.phone_number,
      designation: lead.designation,
      preferred_language: lead.preferred_language,
      calling_mode: callingMode,
      carrier_info: callData.real_carrier_info,
      outcome: callData.outcome,
      is_demo_booked: callData.is_demo_booked,
      demo_booking: callData.demo_booking,
      duration_seconds: callData.duration_seconds || callTimer,
      transcript: callData.transcript,
      ai_summary: callData.ai_summary,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setResults(prev => [resultItem, ...prev]);

    // Update status in lead list
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, call_status: callData.outcome } : l));

    // Post-call breather
    const delayAfter = dialSpeed === 'turbo' ? 300 : 1500;
    await sleep(delayAfter);

    return resultItem;
  };

  // Main dialer queue runner
  const handleStartDialing = async () => {
    if (leads.length === 0) {
      alert("Please upload a CSV or load sample leads first!");
      return;
    }

    if (callingMode === 'real') {
      if (telephonyProvider === 'twilio' && (!twilioConfig.accountSid || !twilioConfig.authToken)) {
        alert("You have selected REAL CARRIER CALLING. Please enter your Twilio credentials first, or switch to the Free Sandbox.");
        setShowCarrierSettings(true);
        return;
      }
      if (!window.confirm(`You are about to place REAL PHONE CALLS to ${leads.length} contacts via ${telephonyProvider.toUpperCase()}. Proceed?`)) {
        return;
      }
    }

    stopRequestedRef.current = false;
    setIsDialing(true);
    setIsPaused(false);

    let startIdx = currentIndex + 1;
    if (startIdx >= leads.length || startIdx < 0) {
      startIdx = 0;
    }

    for (let i = startIdx; i < leads.length; i++) {
      if (stopRequestedRef.current) break;

      while (isPausedRef.current) {
        await sleep(500);
      }

      setCurrentIndex(i);
      await callSingleLead(leads[i]);
    }

    setIsDialing(false);
    setActiveCallStage('idle');
  };

  // Pause dialer
  const handlePauseDialing = () => {
    setIsPaused(prev => !prev);
  };

  // Stop dialer
  const handleStopDialing = () => {
    stopRequestedRef.current = true;
    setIsDialing(false);
    setIsPaused(false);
    audioSynth.stopRing();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setActiveCallStage('idle');
  };

  // Reset all
  const handleReset = () => {
    handleStopDialing();
    setCurrentIndex(-1);
    setResults([]);
    setCurrentTranscript([]);
    setCurrentLead(null);
    setLastOutcome(null);
    setLeads(prev => prev.map(l => ({ ...l, call_status: 'pending' })));
  };

  // Export Results as CSV
  const handleExportResults = () => {
    if (results.length === 0) {
      alert("No call results to export yet.");
      return;
    }

    let csvContent = "Contact Name,College / Organization,Phone Number,Designation,Language,Calling Mode,Duration (s),Call Outcome,Okay For Demo?,Demo Scheduled Date & Time,Carrier SID,AI Call Summary\n";
    results.forEach(r => {
      const demoDate = r.demo_booking ? `${r.demo_booking.scheduled_date} ${r.demo_booking.scheduled_time}` : 'N/A';
      const cleanSummary = (r.ai_summary || '').replace(/,/g, ';').replace(/"/g, '""');
      const sid = r.carrier_info?.sid || 'N/A';
      csvContent += `"${r.contact_name}","${r.college_name}","${r.phone_number}","${r.designation || ''}","${r.preferred_language}","${r.calling_mode}","${r.duration_seconds}","${r.outcome}","${r.is_demo_booked ? 'YES' : 'NO'}","${demoDate}","${sid}","${cleanSummary}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `calling_results_demo_qualifications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Calculations for KPI Cards
  const totalLeads = leads.length;
  const completedCalls = results.length;
  const demosBooked = results.filter(r => r.is_demo_booked).length;
  const callbacks = results.filter(r => r.outcome === 'callback_requested').length;
  const notInterested = results.filter(r => r.outcome === 'not_interested' || r.outcome === 'opted_out').length;
  const conversionRate = completedCalls > 0 ? Math.round((demosBooked / completedCalls) * 100) : 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner with Calling Mode Switcher */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border border-blue-500/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                callingMode === 'real'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}>
                <Radio className={`w-3.5 h-3.5 ${callingMode === 'real' ? 'animate-pulse' : ''}`} />
                <span>{callingMode === 'real' ? 'LIVE CARRIER CALLING (Real Phone Lines)' : '100% Free Virtual Sandbox Mode'}</span>
              </span>
              
              <button
                type="button"
                onClick={() => setShowCarrierSettings(!showCarrierSettings)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-all"
              >
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                <span>Carrier Setup & API Keys</span>
              </button>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Client Auto-Dialer & Demo Qualifier
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Upload your client spreadsheet. The AI dials each lead, answers naturally in Telugu or English, pitches the Student Management System, and instantly categorizes whether they are <strong>OK for a demo</strong> or decline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadSampleCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-slate-200 text-xs font-medium transition-all shadow-sm"
              title="Download standard CSV format with College, Contact, Phone & Language headers"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Sample CSV</span>
            </button>

            <button
              onClick={loadSampleLeads}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-medium transition-all shadow-sm"
              title="Preload 5 Andhra & Telangana College Principals"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>Load 5 Leads</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Carrier Settings Drawer (Expandable) */}
      {showCarrierSettings && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl space-y-5 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Key className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Telephony Gateway Configuration (Real Carrier Calling)</h3>
            </div>
            <button
              onClick={() => setShowCarrierSettings(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Telephony Provider</label>
              <select
                value={telephonyProvider}
                onChange={(e) => setTelephonyProvider(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="twilio">Twilio (Recommended for Free Trial / Global Calling)</option>
                <option value="exotel">Exotel (Indian Cloud Telephony)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Twilio Account SID</label>
              <input
                type="text"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twilioConfig.accountSid}
                onChange={(e) => saveTwilioCredentials({ ...twilioConfig, accountSid: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Twilio Auth Token</label>
              <input
                type="password"
                placeholder="Auth Token"
                value={twilioConfig.authToken}
                onChange={(e) => saveTwilioCredentials({ ...twilioConfig, authToken: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Virtual Caller ID Number (From)</label>
              <input
                type="text"
                placeholder="+1205xxxxxxx or Twilio Number"
                value={twilioConfig.fromNumber}
                onChange={(e) => saveTwilioCredentials({ ...twilioConfig, fromNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between p-3 rounded-xl bg-blue-950/40 border border-blue-500/20 text-[11px] text-slate-300">
              <div>
                <span className="font-semibold text-blue-400">💡 Free Twilio Trial Guide: </span>
                You can create a free account at <code>twilio.com</code>, receive $15.50 in free calling credit and a free number to dial your phone immediately without paying.
              </div>
            </div>
          </div>

          {/* Quick Test Single Phone Call Tool */}
          <div className="pt-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
              <input
                type="tel"
                placeholder="Enter your real phone to test (e.g. +919876543210)"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-mono"
              />
              <button
                type="button"
                onClick={handleTestRealPhoneCall}
                disabled={isTestingCall}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs whitespace-nowrap shadow-md disabled:opacity-50"
              >
                {isTestingCall ? "Dialing..." : "📞 Ring My Phone Now"}
              </button>
            </div>

            {testCallStatus && (
              <div className={`text-xs px-3 py-2 rounded-xl border ${
                testCallStatus.state === 'success' ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' :
                testCallStatus.state === 'error' ? 'bg-rose-950/60 border-rose-500/50 text-rose-300' :
                'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {testCallStatus.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-sm">
          <div className="text-xs text-slate-400 font-medium">Uploaded Leads</div>
          <div className="text-2xl font-bold text-white mt-1">{totalLeads}</div>
          <div className="text-[11px] text-slate-500 mt-1">Ready in queue</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-sm">
          <div className="text-xs text-slate-400 font-medium">Calls Completed</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{completedCalls} / {totalLeads}</div>
          <div className="text-[11px] text-slate-500 mt-1">{totalLeads > 0 ? Math.round((completedCalls / totalLeads) * 100) : 0}% processed</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-semibold">🟢 OK FOR DEMO</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{demosBooked}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">{conversionRate}% conversion rate</div>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-semibold">🟡 Callbacks</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{callbacks}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">Scheduled for later</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">⚪ Declined / Busy</span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-300 mt-1">{notInterested}</div>
          <div className="text-[11px] text-slate-500 mt-1">Existing ERP / Opt-out</div>
        </div>
      </div>

      {/* Main Two-Column Layout: Controls & Live Virtual Call Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: CSV Upload & Dialer Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* CSV File Upload Box */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Upload Client CSV File</span>
              </h2>
              <span className="text-[11px] text-slate-400">Accepts .csv</span>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700/80 hover:border-slate-500 bg-slate-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {uploadLoading ? "Parsing and validating clients..." : "Click to browse or drop CSV here"}
                </div>
                <p className="text-[11px] text-slate-400 max-w-xs leading-normal">
                  Required columns: <code>contact_name</code>, <code>phone_number</code>. Optional: <code>college_name</code>, <code>email</code>, <code>preferred_language</code>.
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Calling Controls & Simulation Mode */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Dialer Control Center</span>
              </h2>

              {/* Mode Toggle Pills */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCallingMode('simulated')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    callingMode === 'simulated'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Free Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCallingMode('real');
                    if (!twilioConfig.accountSid) setShowCarrierSettings(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    callingMode === 'real'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Real Calling
                </button>
              </div>
            </div>

            {/* Audio & Speed Controls */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setVoiceAudioEnabled(!voiceAudioEnabled)}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  voiceAudioEnabled
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {voiceAudioEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4" />}
                  <span>Voice Audio</span>
                </div>
                <span className="text-[10px] font-bold uppercase">{voiceAudioEnabled ? 'ON' : 'MUTED'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDialSpeed(dialSpeed === 'live' ? 'turbo' : 'live')}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  dialSpeed === 'live'
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-amber-600/20 border-amber-500/40 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Speed</span>
                </div>
                <span className="text-[10px] font-bold uppercase">{dialSpeed === 'live' ? 'Live Speech' : '⚡ Turbo'}</span>
              </button>
            </div>

            {/* Outcome Behavior Preference */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Demo Qualification AI Logic:</span>
                <span className="text-cyan-400 font-semibold">{forcedOutcome === 'auto' ? 'Realistic 55% Demo Rate' : forcedOutcome}</span>
              </label>
              <select
                value={forcedOutcome}
                onChange={(e) => setForcedOutcome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="auto">Natural AI Conversation (55% Demos, 20% Callbacks, 15% Info, 10% No)</option>
                <option value="demo_requested">Force Test: Always Book Demo (100% OK for Demo)</option>
                <option value="callback_requested">Force Test: Always Callback Requested</option>
                <option value="not_interested">Force Test: Decline / Existing ERP</option>
              </select>
            </div>

            {/* Action Buttons: Start / Pause / Reset */}
            <div className="flex items-center gap-3 pt-2">
              {!isDialing ? (
                <button
                  type="button"
                  onClick={handleStartDialing}
                  disabled={leads.length === 0}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-xs transition-all shadow-lg disabled:opacity-50 text-white ${
                    callingMode === 'real'
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-900/30'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30'
                  }`}
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{callingMode === 'real' ? `Call Real Clients (${leads.length})` : `Start Free Calling (${leads.length})`}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePauseDialing}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all shadow-lg"
                  >
                    <Pause className="w-4 h-4" />
                    <span>{isPaused ? "Resume Calling" : "Pause Queue"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStopDialing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-semibold text-xs transition-all shadow-lg"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Stop</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleReset}
                disabled={isDialing}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 disabled:opacity-40"
                title="Reset queue"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Queue Preview */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Client Queue ({leads.length})</span>
              <span className="text-slate-500">
                {currentIndex >= 0 ? `Dialing #${currentIndex + 1}` : 'Ready to start'}
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {leads.map((lead, idx) => {
                const isCurrent = idx === currentIndex;
                const status = lead.call_status || 'pending';
                return (
                  <div
                    key={lead.id || idx}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-blue-600/20 border-blue-500/50 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-slate-950/40 border-slate-800/80'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-slate-200 truncate flex items-center gap-1.5">
                        <span>{lead.contact_name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({lead.designation || 'Client'})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-2">
                        <span>{lead.college_name}</span>
                        <span>•</span>
                        <span>{lead.phone_number}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold bg-slate-800 text-slate-400">
                        {lead.preferred_language || 'te'}
                      </span>
                      {status === 'pending' && !isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-slate-600" title="Pending" />
                      )}
                      {isCurrent && (
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" title="Calling now" />
                      )}
                      {status === 'demo_requested' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Demo OK
                        </span>
                      )}
                      {status === 'callback_requested' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Callback
                        </span>
                      )}
                      {status === 'not_interested' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400">
                          Declined
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Phone Call Screen & Dialogue (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Virtual Phone Display Card */}
          <div className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-white/10 shadow-2xl p-6 min-h-[460px] flex flex-col justify-between">
            {/* Header of Active Call */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${
                    activeCallStage === 'ringing' ? 'bg-amber-400 animate-ping' :
                    activeCallStage === 'connected' ? (callingMode === 'real' ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400 animate-pulse') :
                    'bg-slate-600'
                  }`} />
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>
                        {activeCallStage === 'idle' && "Virtual Caller Terminal"}
                        {activeCallStage === 'ringing' && (callingMode === 'real' ? "Carrier Dialing Physical Phone..." : "Dialing Client...")}
                        {activeCallStage === 'connected' && (callingMode === 'real' ? "🔴 Live Carrier Call In Progress" : "Live Outbound Call in Progress")}
                        {activeCallStage === 'ended' && "Call Finished • Outcome Analyzed"}
                      </span>
                      {callingMode === 'real' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase">
                          Real Phone Line
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Pitching: Student Management System (QR Attendance & Shortage Automation)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400">
                    ⏱️ {String(Math.floor(callTimer / 60)).padStart(2, '0')}:{String(callTimer % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Contact Call Badge */}
              {currentLead ? (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
                      {currentLead.contact_name?.[0] || 'C'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {currentLead.contact_name} <span className="text-slate-400 font-normal">({currentLead.designation || 'Client'})</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {currentLead.college_name} • <span className="font-mono text-cyan-300">{currentLead.phone_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-900/30 border border-blue-500/30 text-blue-300">
                      {currentLead.preferred_language === 'te' ? 'Telugu Voice' : 'English Voice'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-8 text-center text-slate-500 text-xs">
                  Upload a CSV or click "Start Calling Clients" to launch the AI voice caller.
                </div>
              )}
            </div>

            {/* Middle: Dialogue Turn Stream */}
            <div className="my-4 flex-1 overflow-y-auto max-h-72 space-y-3 pr-2">
              {currentTranscript.length === 0 && activeCallStage === 'ringing' && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin flex items-center justify-center">
                    <PhoneCall className="w-5 h-5 text-amber-400 animate-pulse" />
                  </div>
                  <div className="text-xs">
                    {callingMode === 'real'
                      ? `Routing call via ${telephonyProvider.toUpperCase()} carrier network to real phone...`
                      : "Ringing client's mobile phone..."}
                  </div>
                </div>
              )}

              {currentTranscript.map((msg, idx) => {
                const isAgent = msg.role === 'agent';
                const isSystem = msg.role === 'system';

                if (isSystem) {
                  return (
                    <div key={idx} className="text-center my-2">
                      <span className="text-[11px] px-3 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${isAgent ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAgent && (
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs shadow-md leading-relaxed ${
                        isAgent
                          ? 'bg-blue-950/80 border border-blue-500/30 text-slate-100 rounded-tl-none'
                          : 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-100 rounded-tr-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          {isAgent ? "Nani AI Calling Agent" : currentLead?.contact_name || "Client"}
                        </span>
                        <span className="font-mono">{msg.timestamp || '00:00'}</span>
                      </div>
                      <p>{msg.text}</p>
                    </div>
                    {!isAgent && (
                      <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Outcome Display Banner */}
            {lastOutcome && (
              <div className={`p-4 rounded-xl border mt-2 transition-all ${
                lastOutcome.is_demo_booked
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                  : lastOutcome.outcome === 'callback_requested'
                  ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                  : lastOutcome.outcome === 'carrier_failed'
                  ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {lastOutcome.is_demo_booked ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : lastOutcome.outcome === 'callback_requested' ? (
                      <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide">
                        {lastOutcome.is_demo_booked
                          ? "🎉 CLIENT OKAY FOR DEMO • DEMO BOOKED!"
                          : lastOutcome.outcome === 'callback_requested'
                          ? "📞 CALLBACK REQUESTED"
                          : lastOutcome.outcome === 'carrier_failed'
                          ? "⚠️ REAL CARRIER ERROR"
                          : "⚪ CLIENT DECLINED / CURRENTLY NOT INTERESTED"}
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">
                        {lastOutcome.ai_summary || lastOutcome.error}
                      </div>
                      {lastOutcome.real_carrier_info && (
                        <div className="text-[10px] text-cyan-300 mt-1 font-mono">
                          Carrier SID: {lastOutcome.real_carrier_info.sid} ({lastOutcome.real_carrier_info.provider})
                        </div>
                      )}
                    </div>
                  </div>

                  {lastOutcome.demo_booking && (
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase font-bold text-emerald-300">Scheduled Date & Time</div>
                      <div className="text-xs font-semibold text-white">
                        {lastOutcome.demo_booking.scheduled_date} @ {lastOutcome.demo_booking.scheduled_time}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time Live Results Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Real-Time Calling Results & Demo Status</span>
            </h2>
            <p className="text-xs text-slate-400">
              Each row updates in real time as the client answers and confirms demo interest.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportResults}
              disabled={results.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all disabled:opacity-40"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Outcomes (CSV)</span>
            </button>

            <Link
              to="/demos"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 text-xs font-medium transition-all"
            >
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>View Booked Demos Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Results Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-3">Client Name</th>
                <th className="py-3 px-3">College / Institution</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Demo Qualification Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No calls executed yet. Click "Start Free Calling" or "Call Real Clients" above to begin dialing.
                  </td>
                </tr>
              ) : (
                results.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      <div>{r.contact_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{r.designation || 'Client'}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{r.college_name}</td>
                    <td className="py-3 px-3 font-mono text-cyan-300">{r.phone_number}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        r.calling_mode === 'real'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {r.calling_mode === 'real' ? 'Real Phone' : 'Sandbox'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{r.duration_seconds}s</td>
                    <td className="py-3 px-3">
                      {r.is_demo_booked ? (
                        <div className="inline-flex flex-col">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>OK FOR DEMO (Scheduled)</span>
                          </span>
                          {r.demo_booking && (
                            <span className="text-[10px] text-emerald-400/90 mt-1 pl-1 font-mono">
                              📅 {r.demo_booking.scheduled_date} @ {r.demo_booking.scheduled_time}
                            </span>
                          )}
                        </div>
                      ) : r.outcome === 'callback_requested' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Callback Requested</span>
                        </span>
                      ) : r.outcome === 'info_requested' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          <Info className="w-3.5 h-3.5" />
                          <span>Brochure Sent</span>
                        </span>
                      ) : r.outcome === 'carrier_failed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-950/60 text-rose-300 border border-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Carrier Error</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Declined / Has ERP</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedTranscriptLead(r)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
                      >
                        Transcript
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Inspection Modal */}
      {selectedTranscriptLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Call Transcript:</span>
                  <span className="text-blue-400">{selectedTranscriptLead.contact_name}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedTranscriptLead.college_name} • {selectedTranscriptLead.phone_number} • {selectedTranscriptLead.preferred_language === 'te' ? 'Telugu' : 'English'}
                </p>
              </div>
              <button
                onClick={() => setSelectedTranscriptLead(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <span className="font-semibold text-slate-100">AI Call Summary: </span>
                {selectedTranscriptLead.ai_summary}
              </div>

              {selectedTranscriptLead.carrier_info?.sid && (
                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 font-mono">
                  Real Carrier SID: {selectedTranscriptLead.carrier_info.sid}
                </div>
              )}

              {selectedTranscriptLead.transcript?.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs ${
                    t.role === 'agent'
                      ? 'bg-blue-950/60 border border-blue-500/20 text-blue-100'
                      : t.role === 'lead'
                      ? 'bg-emerald-950/60 border border-emerald-500/20 text-emerald-100'
                      : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-semibold uppercase">
                      {t.role === 'agent' ? 'Nani AI Sales Caller' : selectedTranscriptLead.contact_name}
                    </span>
                    <span className="font-mono">{t.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-slate-950">
              <div className="text-xs">
                Status:{' '}
                {selectedTranscriptLead.is_demo_booked ? (
                  <span className="font-bold text-emerald-400">🟢 OK FOR DEMO</span>
                ) : (
                  <span className="text-slate-400">⚪ {selectedTranscriptLead.outcome}</span>
                )}
              </div>
              <button
                onClick={() => setSelectedTranscriptLead(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
