import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import AddLeadModal from '../components/AddLeadModal';
import CsvImportModal from '../components/CsvImportModal';
import LeadDetailModal from '../components/LeadDetailModal';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  UploadCloud, 
  PhoneCall, 
  MoreVertical, 
  Globe, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Building2,
  Trash2,
  Eye
} from 'lucide-react';

export default function LeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 15;

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * limit,
        limit,
        sort_by: 'created_at',
        sort_order: 'desc'
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (langFilter) params.language = langFilter;

      const [res, countRes] = await Promise.all([
        api.get('/leads', { params }),
        api.get('/leads/count', { params })
      ]);

      setLeads(res.data);
      setTotalCount(countRes.data.total);
    } catch (err) {
      console.error("Failed to load college leads", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter, langFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchLeads();
  };

  const handleDeleteLead = async (leadId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this college lead?")) {
      try {
        await api.delete(`/leads/${leadId}`);
        fetchLeads();
      } catch (err) {
        console.error("Failed to delete lead", err);
      }
    }
  };

  const handleTriggerCall = (lead) => {
    // Navigate to interactive sandbox pre-filled with this lead!
    navigate(`/simulator?lead_id=${lead.id}`);
  };

  const getStatusBadge = (status, isSuppressed) => {
    if (isSuppressed) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          Suppressed (DND)
        </span>
      );
    }
    const styles = {
      new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      interested: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      demo_requested: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold',
      callback_requested: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      not_interested: 'bg-slate-700/50 text-slate-400 border-white/5',
      opted_out: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      in_progress: 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border capitalize ${styles[status] || styles.new}`}>
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      {/* Header & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-500" />
            <span>College Lead Management</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {totalCount} Colleges
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Outreach targets in Andhra Pradesh and Telangana for Student Management System
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search college, contact, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="interested">Interested</option>
            <option value="demo_requested">Demo Requested</option>
            <option value="callback_requested">Callback Scheduled</option>
            <option value="not_interested">Not Interested</option>
            <option value="opted_out">Opted Out (DND)</option>
          </select>

          {/* Language filter */}
          <select
            value={langFilter}
            onChange={(e) => {
              setLangFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Languages</option>
            <option value="te">Telugu (తెలుగు)</option>
            <option value="en">English</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setLangFilter('');
              setPage(0);
              fetchLeads();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">College & Location</th>
                <th className="py-3.5 px-4">Key Contact</th>
                <th className="py-3.5 px-4">Phone Number</th>
                <th className="py-3.5 px-4">Language</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Attempts</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Loading college contacts...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="font-medium">No leads match your filter criteria.</p>
                    <p className="text-[11px] text-slate-500">Try adjusting your search terms or add a new college lead.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {lead.college_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lead.location || 'AP / Telangana'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{lead.contact_name}</div>
                      <div className="text-[11px] text-slate-400">{lead.designation || 'Faculty In-Charge'}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-cyan-400">
                      {lead.phone_number}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5 uppercase">
                        {lead.preferred_language === 'te' ? 'Telugu' : lead.preferred_language === 'en' ? 'English' : 'Auto'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(lead.status, lead.is_suppressed)}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <span className="font-semibold text-white">{lead.call_attempts}</span>
                      {lead.last_called_at && (
                        <span className="text-[10px] text-slate-500 block">
                          {new Date(lead.last_called_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {!lead.is_suppressed && (
                          <button
                            onClick={() => handleTriggerCall(lead)}
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
                            title="Call this college lead"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteLead(lead.id, e)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalCount)} of {totalCount} leads
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-white">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddLeadModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onLeadAdded={() => {
          fetchLeads();
        }}
      />

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={() => {
          fetchLeads();
        }}
      />

      <LeadDetailModal
        leadId={selectedLeadId}
        isOpen={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={() => {
          fetchLeads();
        }}
        onTriggerCall={handleTriggerCall}
      />
    </div>
  );
}
