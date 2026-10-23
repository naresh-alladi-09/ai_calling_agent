import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  Mic, 
  Megaphone, 
  Calendar, 
  Sliders, 
  ShieldCheck,
  GraduationCap
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'College Leads', icon: Users },
  { path: '/calls', label: 'Call History', icon: PhoneCall },
  { path: '/simulator', label: 'Voice Sandbox', icon: Mic, highlight: true },
  { path: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/demos', label: 'Demo Bookings', icon: Calendar },
  { path: '/settings', label: 'AI Configuration', icon: Sliders },
  { path: '/compliance', label: 'TRAI Compliance & DND', icon: ShieldCheck },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-white/10 bg-slate-950/60 backdrop-blur-md flex flex-col justify-between py-6 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6 px-4">
        {/* Pitch Target Notice */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-500/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-1">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span>Target Pitch</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Selling <strong>Student Management System</strong>: QR attendance, shortage engine, SGPA calculator to colleges.
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  } ${item.highlight && !isActive ? 'border border-cyan-500/30 bg-cyan-950/20 text-cyan-300' : ''}`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.highlight && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    Live
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="px-6 text-[11px] text-slate-500 space-y-1">
        <div>Bilingual AI Telephony v1.0</div>
        <div>Telugu & English Engine</div>
      </div>
    </aside>
  );
}
