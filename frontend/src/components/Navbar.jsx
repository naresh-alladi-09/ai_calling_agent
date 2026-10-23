import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PhoneCall, ShieldAlert, LogOut, Clock, Activity, Globe } from 'lucide-react';
import api from '../api/client';

export default function Navbar({ callingMode = 'demo', onEmergencyStop }) {
  const { user, logout } = useAuth();
  const [istTime, setIstTime] = useState('');
  const [isWithinHours, setIsWithinHours] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // IST is UTC+5:30
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istDate = new Date(utc + (3600000 * 5.5));
      const hours = istDate.getHours();
      const minutes = istDate.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;

      setIstTime(`${formattedHours}:${minutes} ${ampm} IST`);
      setIsWithinHours(hours >= 9 && hours < 20);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-white/10 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Language Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <PhoneCall className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              Nani AI Caller
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Bilingual v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Globe className="w-3 h-3 text-cyan-400" />
              Telugu & Indian English Voice
            </p>
          </div>
        </div>
      </div>

      {/* Center status indicators */}
      <div className="flex items-center gap-3">
        {/* Environment Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
          callingMode === 'live' 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${callingMode === 'live' ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
          {callingMode === 'live' ? 'LIVE CARRIER CALLING' : 'DEMO MODE (Safe Simulation)'}
        </div>

        {/* TRAI Window Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border ${
          isWithinHours 
            ? 'bg-slate-800 border-white/10 text-slate-300' 
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{istTime}</span>
          <span className="text-[11px] text-slate-500">•</span>
          <span className="text-[11px]">{isWithinHours ? 'TRAI Window Open (9AM-8PM)' : 'Window Closed'}</span>
        </div>
      </div>

      {/* Right Actions & User */}
      <div className="flex items-center gap-3">
        {/* Global Emergency Stop */}
        <button
          onClick={onEmergencyStop}
          title="Emergency Stop: Immediately aborts all ongoing outbound calls"
          className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          <span>Kill Switch</span>
        </button>

        {/* User profile & Logout */}
        <div className="flex items-center gap-2 pl-3 border-l border-white/10">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-200">{user?.full_name || 'Admin'}</div>
            <div className="text-[10px] text-slate-400">{user?.email || 'admin@nani-caller.ai'}</div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
