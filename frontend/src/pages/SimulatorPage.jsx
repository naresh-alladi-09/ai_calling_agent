import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Send, 
  Globe, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  CalendarCheck, 
  ShieldBan, 
  Building2, 
  AlertCircle,
  HelpCircle,
  Play
} from 'lucide-react';

export default function SimulatorPage() {
  const [searchParams] = useSearchParams();
  const preselectedLeadId = searchParams.get('lead_id');

  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(preselectedLeadId || '');
  const [selectedLang, setSelectedLang] = useState('te');
  const [activeCall, setActiveCall] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [loadingTurn, setLoadingTurn] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [intelligence, setIntelligence] = useState({
    detectedLanguage: 'te',
    outcome: 'in_progress',
    objections: [],
    demoBooking: null,
    optOutDetected: false,
    aiSummary: ''
  });

  const chatBottomRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load college leads for dropdown
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const res = await api.get('/leads?limit=50');
        setLeads(res.data);
        if (!selectedLeadId && res.data.length > 0) {
          setSelectedLeadId(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load leads", err);
      }
    };
    loadLeads();
  }, []);

  // Web Speech API for voice dictation
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLang === 'te' ? 'te-IN' : 'en-IN';

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setUserInput(text);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, [selectedLang]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Speech synthesis helper
  const speakText = (text, lang) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'te' ? 'te-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 0.95; // Slightly lower pitch for friendly Indian male tone

    // Try finding an Indian English voice if speaking English
    if (lang === 'en') {
      const voices = window.speechSynthesis.getVoices();
      const inVoice = voices.find(v => v.lang.includes('IN') || v.name.includes('India') || v.name.includes('Ravi'));
      if (inVoice) utterance.voice = inVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const startCall = async () => {
    if (!selectedLeadId) return;
    setIsCalling(true);
    setTranscript([]);
    setIntelligence({
      detectedLanguage: selectedLang,
      outcome: 'in_progress',
      objections: [],
      demoBooking: null,
      optOutDetected: false,
      aiSummary: ''
    });

    try {
      const res = await api.post(`/calls/simulate-start?lead_id=${selectedLeadId}&language_override=${selectedLang}`);
      const data = res.data;
      setActiveCall(data);
      setTranscript([
        {
          role: 'agent',
          text: data.agent_response,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      speakText(data.agent_response, data.detected_language);
    } catch (err) {
      console.error("Failed to start call", err);
      setIsCalling(false);
    }
  };

  const endCall = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsCalling(false);
    setActiveCall(null);
  };

  const handleSendTurn = async (textToSend) => {
    const text = textToSend || userInput;
    if (!text.trim() || !activeCall) return;

    setUserInput('');
    setLoadingTurn(true);

    // Append user message
    const userMsg = {
      role: 'lead',
      text,
      timestamp: new Date().toLocaleTimeString()
    };
    setTranscript(prev => [...prev, userMsg]);

    try {
      const res = await api.post('/calls/simulate-turn', {
        user_speech: text,
        call_id: activeCall.call_id,
        language_hint: intelligence.detectedLanguage
      });

      const reply = res.data;

      // Append agent reply
      setTranscript(prev => [
        ...prev,
        {
          role: 'agent',
          text: reply.agent_response,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // Update intelligence state
      setIntelligence(prev => ({
        detectedLanguage: reply.detected_language,
        outcome: reply.outcome || prev.outcome,
        objections: reply.detected_objections || prev.objections,
        demoBooking: reply.demo_booking || prev.demoBooking,
        optOutDetected: reply.opt_out_detected,
        aiSummary: reply.ai_summary || prev.aiSummary
      }));

      speakText(reply.agent_response, reply.detected_language);

      if (reply.call_status === 'completed') {
        setTimeout(() => {
          setIsCalling(false);
        }, 3000);
      }
    } catch (err) {
      console.error("Turn failed", err);
    } finally {
      setLoadingTurn(false);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser. You can type or use the test pills below!");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = intelligence.detectedLanguage === 'te' ? 'te-IN' : 'en-IN';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const quickPillsEnglish = [
    "Yes, I have two minutes. Tell me what your system does.",
    "We already have software and ERP.",
    "We take manual attendance on paper registers.",
    "What is the price of your software?",
    "Can you send us an email brochure?",
    "I am busy right now, please call tomorrow.",
    "We are not interested, thank you.",
    "Stop calling, please remove my number.",
    "Sure, let's schedule an online demo tomorrow at 11:30 AM."
  ];

  const quickPillsTelugu = [
    "చెప్పండి, రెండు నిమిషాలు మాట్లాడవచ్చు.",
    "మా కాలేజీలో ఇప్పటికే సాఫ్ట్‌వేర్ వాడుతున్నాము.",
    "మేము రిజిస్టర్‌లో మాన్యువల్ అటెండెన్స్ తీసుకుంటాము.",
    "మీ సాఫ్ట్‌వేర్ ధర ఎంత ఉంటుంది?",
    "వివరాలు ఈమెయిల్‌కి పంపించండి.",
    "ఇప్పుడు క్లాస్‌లో ఉన్నాను, రేపు కాల్ చేయండి.",
    "మాకు ఆసక్తి లేదు, థాంక్స్.",
    "నా నంబర్‌ను లిస్ట్ నుండి తొలగించండి, కాల్ చేయవద్దు.",
    "సరేనండి, రేపు ఉదయం 11:30 గంటలకు డెమో షెడ్యూల్ చేయండి."
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Mic className="w-5 h-5 text-cyan-400" />
            <span>Interactive Voice Calling Sandbox</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time bilingual voice simulation: test discovery, objections, code-switching, and lead qualification
          </p>
        </div>

        {/* TTS Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (ttsEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
              setTtsEnabled(!ttsEnabled);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              ttsEnabled 
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' 
                : 'bg-slate-800 border-white/10 text-slate-400'
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            <span>Voice Audio: {ttsEnabled ? 'Enabled' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Call Simulator */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm overflow-hidden flex flex-col h-[650px] shadow-2xl">
          {/* Call Session Header Bar */}
          <div className="p-4 border-b border-white/10 bg-slate-950/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isCalling ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              <div>
                <span className="text-xs font-bold text-white block">
                  {isCalling ? 'Call In-Progress with College' : 'Outbound Call Sandbox'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {activeCall ? `Provider: simulated • Session ID: #${activeCall.call_id}` : 'Select a target college to initiate call'}
                </span>
              </div>
            </div>

            {/* Language & Action Controls */}
            {!isCalling ? (
              <div className="flex items-center gap-2">
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white max-w-[200px] truncate"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.college_name} ({l.contact_name})
                    </option>
                  ))}
                </select>

                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                >
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="en">English</option>
                </select>

                <button
                  onClick={startCall}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call College</span>
                </button>
              </div>
            ) : (
              <button
                onClick={endCall}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Hang Up</span>
              </button>
            )}
          </div>

          {/* Transcript / Dialogue Feed */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {!isCalling && transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                  <PhoneCall className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ready to Pitch Student Management System</h3>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    Select a college lead above and click <strong>"Call College"</strong> to initiate an AI call. You can talk freely in Telugu or English, test objections, and schedule demos.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {transcript.map((msg, i) => {
                  const isAgent = msg.role === 'agent';
                  return (
                    <div
                      key={i}
                      className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} animate-fade-in`}
                    >
                      <div className="text-[10px] font-semibold text-slate-400 mb-1 px-1 flex items-center gap-1.5">
                        <span>{isAgent ? 'Nani (AI Sales Agent)' : 'Faculty In-Charge'}</span>
                        <span className="text-slate-600">• {msg.timestamp}</span>
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                          isAgent
                            ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-tl-sm shadow-md'
                            : 'bg-slate-800 text-slate-200 border border-white/10 rounded-tr-sm shadow-md'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {loadingTurn && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce delay-100" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-200" />
                    <span className="text-[11px] italic">Nani AI is thinking...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </>
            )}
          </div>

          {/* User Input & Quick Test Pills */}
          <div className="p-4 border-t border-white/10 bg-slate-950/60 space-y-3">
            {/* Quick Objection Test Pills */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-between">
                <span>Quick Sales Scenarios & Objections:</span>
                <span className="text-slate-500">Click to respond instantly</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(intelligence.detectedLanguage === 'te' ? quickPillsTelugu : quickPillsEnglish).map((pill, idx) => (
                  <button
                    key={idx}
                    disabled={!isCalling || loadingTurn}
                    onClick={() => handleSendTurn(pill)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-[11px] transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTurn();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleMic}
                disabled={!isCalling}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                    : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                }`}
                title="Dictate with voice"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                disabled={!isCalling}
                placeholder={isCalling ? "Type faculty response in Telugu or English..." : "Start call above to begin speaking"}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!isCalling || !userInput.trim() || loadingTurn}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Live Call Intelligence Panel */}
        <div className="space-y-4">
          {/* Active Call Summary Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Sales Intelligence</span>
            </h3>

            <div className="space-y-3 text-xs">
              {/* Language Detected */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-white/5">
                <span className="text-slate-400">Language In Use</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-semibold uppercase">
                  {intelligence.detectedLanguage === 'te' ? 'Telugu (తెలుగు)' : 'Indian English'}
                </span>
              </div>

              {/* Prospect Qualification Outcome */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-white/5">
                <span className="text-slate-400">Lead Outcome</span>
                <span className={`px-2 py-0.5 rounded-md font-semibold capitalize ${
                  intelligence.outcome === 'demo_requested'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : intelligence.outcome === 'opted_out'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-700 text-slate-200'
                }`}>
                  {intelligence.outcome.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Detected Objections */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-semibold text-slate-400">Detected Objections:</div>
                {intelligence.objections.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {intelligence.objections.map((obj, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {obj}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">None detected yet</span>
                )}
              </div>

              {/* AI Conversation Summary */}
              {intelligence.aiSummary && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400">AI Call Summary:</div>
                  <div className="text-[11px] text-slate-200 leading-relaxed italic">
                    "{intelligence.aiSummary}"
                  </div>
                </div>
              )}

              {/* Demo Booking Card */}
              {intelligence.demoBooking && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CalendarCheck className="w-4 h-4" />
                    <span>Product Demo Scheduled!</span>
                  </div>
                  <div className="text-[11px] text-slate-200 space-y-1">
                    <div>Date: <strong>{intelligence.demoBooking.scheduled_date}</strong></div>
                    <div>Time: <strong>{intelligence.demoBooking.scheduled_time}</strong></div>
                    <div>Contact: <strong>{intelligence.demoBooking.contact_name}</strong></div>
                  </div>
                </div>
              )}

              {/* Opt-out Warning Card */}
              {intelligence.optOutDetected && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1 text-xs text-rose-400 animate-fade-in">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldBan className="w-4 h-4" />
                    <span>Contact Opted Out</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Number permanently added to Do-Not-Call suppression list. All future outbound calls blocked.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SMS Factual Capabilities Card */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2 text-xs">
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Grounded SMS Capabilities</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Nani AI only speaks about features existing in the student management system:
            </p>
            <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4">
              <li>Expiring 30s Dynamic QR Attendance (Anti-proxy)</li>
              <li>Manual Attendance Register fallback</li>
              <li>75% Mathematical Shortage Alert Engine</li>
              <li>3-tier RBAC with strict student data isolation</li>
              <li>UGC-compliant SGPA / CGPA tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
