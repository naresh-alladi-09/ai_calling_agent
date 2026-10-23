import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatCard from '../components/StatCard';
import { 
  Users, 
  PhoneCall, 
  CheckCircle2, 
  CalendarCheck, 
  PhoneForwarded, 
  UserX, 
  ShieldBan, 
  Clock, 
  IndianRupee, 
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Play
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  CartesianGrid, 
  Legend 
} from 'recharts';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/dashboard/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const OUTCOME_COLORS = ['#3b82f6', '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#64748b', '#f43f5e'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading Nani AI calling intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner / Mode alert */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Active Environment: {metrics?.calling_mode === 'live' ? 'Live Telephony Mode' : 'Interactive Demo Sandbox'}
            </span>
            <span className="text-xs text-slate-400">• Voice: Sarvam Telugu + Indian English</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Nani AI Outbound Calling Platform
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Autonomous sales agent calling college management across Andhra Pradesh and Telangana to schedule demos for the Student Management System.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/simulator')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Test Call in Sandbox</span>
          </button>
          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total College Leads"
          value={metrics?.total_leads || 0}
          subtitle="Directory & CSV contacts"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Calls Attempted"
          value={metrics?.calls_attempted || 0}
          subtitle={`${metrics?.calls_connected || 0} connected (${metrics?.connection_rate || 0}%)`}
          icon={PhoneCall}
          color="cyan"
        />
        <StatCard
          title="Demo Requests"
          value={metrics?.demo_requests || 0}
          subtitle={`${metrics?.demo_conversion_rate || 0}% conversion rate`}
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Estimated Expenditure"
          value={`₹${metrics?.estimated_expenditure_inr?.toFixed(2) || '0.00'}`}
          subtitle={`Total duration: ${formatDuration(metrics?.total_call_duration_seconds || 0)}`}
          icon={IndianRupee}
          color="amber"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Interested Prospects</span>
          </div>
          <div className="text-xl font-bold text-white">{metrics?.interested_prospects || 0}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <PhoneForwarded className="w-3.5 h-3.5 text-amber-400" />
            <span>Callbacks Scheduled</span>
          </div>
          <div className="text-xl font-bold text-white">{metrics?.callbacks_scheduled || 0}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <UserX className="w-3.5 h-3.5 text-slate-400" />
            <span>Not Interested</span>
          </div>
          <div className="text-xl font-bold text-white">{metrics?.not_interested_prospects || 0}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <ShieldBan className="w-3.5 h-3.5 text-rose-400" />
            <span>Opt-Out / Suppression</span>
          </div>
          <div className="text-xl font-bold text-rose-400">{metrics?.opt_out_requests || 0}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Calling Trends Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Calling Performance</h3>
              <p className="text-xs text-slate-400">Calls attempted, connected, and demos scheduled over last 7 days</p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-white/10 font-mono">
              Last 7 Days
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.daily_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorDemos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '0.75rem', 
                    fontSize: '12px' 
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="calls_attempted" name="Calls Attempted" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCalls)" strokeWidth={2} />
                <Area type="monotone" dataKey="calls_connected" name="Calls Connected" stroke="#06b6d4" fill="none" strokeWidth={2} />
                <Area type="monotone" dataKey="demos_booked" name="Demos Booked" stroke="#10b981" fillOpacity={1} fill="url(#colorDemos)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outcome Breakdown Pie Chart */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Prospect Outcome Funnel</h3>
            <p className="text-xs text-slate-400">Distribution of qualification outcomes</p>
          </div>

          {metrics?.outcomes_distribution?.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.outcomes_distribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {metrics.outcomes_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={OUTCOME_COLORS[index % OUTCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: 'rgba(255,255,255,0.1)', 
                      borderRadius: '0.75rem', 
                      fontSize: '12px' 
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500">
              No completed calls yet. Launch a test call to see outcomes!
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-white/5">
            {metrics?.outcomes_distribution?.slice(0, 4).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: OUTCOME_COLORS[idx % OUTCOME_COLORS.length] }} />
                  <span className="text-slate-300 capitalize">{item.name.replace(/_/g, ' ')}</span>
                </div>
                <span className="font-semibold text-slate-200">{item.count} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
