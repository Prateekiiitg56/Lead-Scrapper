import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  Trash2,
  X,
  Phone,
  MapPin,
  Globe,
  Star,
  ArrowUp,
  ArrowDown,
  List,
  LayoutGrid,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/constants';
import { timeAgo } from '@/lib/utils';
import type { Database } from '@/types/database';

type LeadRow = Database['public']['Tables']['leads']['Row'];
type SortField = 'business_name' | 'phone' | 'city' | 'interest_score' | 'last_contact_at';

/* ── Deterministic avatar tint palette (8 muted, on-brand tones) ── */
const AVATAR_TINTS = [
  'bg-[#2D3047]', // deep navy
  'bg-[#3B3F5C]', // blue-slate
  'bg-[#4A3F5C]', // plum-slate
  'bg-[#5C3D3D]', // muted rosewood
  'bg-[#3D4F5C]', // steel teal
  'bg-[#5C4A3D]', // warm umber
  'bg-[#3D5C4A]', // sage
  'bg-[#5C3D4F]', // mauve
];

/** Pick an avatar tint deterministically from the first char of a string. */
function getAvatarTint(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_TINTS[code % AVATAR_TINTS.length];
}

function LeadDetailPanel({
  lead,
  onClose,
  onUpdate,
  onDelete,
}: {
  lead: LeadRow;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<LeadRow>) => void;
  onDelete: (id: string) => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes || '');

  const handleStatusChange = (newStatus: LeadStatus) => {
    setStatus(newStatus);
    onUpdate(lead.id, { status: newStatus });
  };

  const handleSaveNotes = () => onUpdate(lead.id, { notes });

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-[#d1d5db] z-50 flex flex-col animate-drawer-slide shadow-2xl select-none font-sans text-[#14161A] rounded-l-[28px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-[#d1d5db] bg-[#e8eaf0]">
        <div className="eyebrow text-[#374151] font-bold">Lead Details</div>
        <button
          onClick={onClose}
          className="text-[#4B5563] hover:text-[#14161A] transition-colors p-1.5 rounded-full hover:bg-white/60 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Business info */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-full ${getAvatarTint(lead.business_name)} text-white font-bold text-lg flex items-center justify-center shadow-sm font-mono`}>
              {lead.business_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl leading-tight font-display font-bold text-[#14161A]">
                {lead.business_name}
              </h2>
              {lead.category && <div className="text-[13px] text-[#374151] font-semibold">{lead.category}</div>}
            </div>
          </div>

          <div className="mt-4 space-y-2.5 bg-[#f4f5f8] p-4 rounded-[20px] border border-[#d1d5db]">
            {lead.phone && (
              <div className="flex items-center gap-2.5 text-[13px] text-[#14161A]">
                <Phone className="w-4 h-4 text-[#F0501E]" />
                <span className="font-mono font-bold">{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2.5 text-[13px] text-[#14161A]">
                <Mail className="w-4 h-4 text-[#F0501E]" />
                <span className="font-mono font-bold truncate" title={lead.email}>{lead.email}</span>
              </div>
            )}
            {lead.address && (
              <div className="flex items-center gap-2.5 text-[13px] text-[#374151] font-medium">
                <MapPin className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                <span>{lead.address}</span>
              </div>
            )}
            {lead.website && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <Globe className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F0501E] hover:underline font-bold truncate"
                >
                  {lead.website}
                </a>
              </div>
            )}
            {lead.linkedin_url && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <ExternalLink className="w-4 h-4 text-[#0A66C2] flex-shrink-0" />
                <a
                  href={lead.linkedin_url.startsWith('http') ? lead.linkedin_url : `https://${lead.linkedin_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0A66C2] hover:underline font-bold truncate"
                >
                  LinkedIn Profile
                </a>
              </div>
            )}
            {lead.rating && (
              <div className="flex items-center gap-2.5 text-[13px] text-[#374151]">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-bold text-[#14161A]">{lead.rating} Rating</span>
              </div>
            )}
          </div>
        </div>

        {/* Status picker */}
        <div className="space-y-3">
          <div className="eyebrow text-[#374151] font-bold">Pipeline Status</div>
          <div className="flex flex-wrap gap-2">
            {LEAD_STATUSES.map((s) => (
              <LeadStatusBadge
                key={s}
                status={s}
                active={status === s}
                onClick={() => handleStatusChange(s)}
              />
            ))}
          </div>
        </div>

        {/* AI Summary */}
        {lead.ai_summary && (
          <div className="space-y-2">
            <div className="eyebrow text-[#374151] font-bold">AI Summary</div>
            <div className="bg-[#f4f5f8] rounded-[20px] p-4 text-[13px] text-[#374151] font-medium leading-relaxed border border-[#d1d5db]">
              {lead.ai_summary}
            </div>
            <div className="flex gap-2 mt-2">
              {lead.ai_intent && (
                <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#d1d5db] text-[#14161A] font-mono font-bold">
                  {lead.ai_intent}
                </span>
              )}
              {lead.ai_sentiment && (
                <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#d1d5db] text-[#374151] font-mono font-medium">
                  {lead.ai_sentiment}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <div className="eyebrow text-[#374151] font-bold">Internal Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Add notes about this lead..."
            rows={3}
            className="w-full bg-[#f8f9fc] border border-[#d1d5db] text-[#14161A] placeholder:text-[#6B7280] rounded-[18px] p-3.5 text-[13px] outline-none focus:border-[#F0501E] transition-all resize-none font-medium"
          />
        </div>

        {/* Delete action */}
        <div className="pt-4 border-t border-[#d1d5db]">
          <button
            onClick={() => onDelete(lead.id)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] text-red-600 hover:bg-red-50 transition-colors font-bold border border-red-200 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Lead</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function getDisplayCity(lead: LeadRow): string {
  if (lead.city && lead.city.trim()) return lead.city.trim();
  if (lead.address && lead.address.trim()) {
    const parts = lead.address.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      return parts[parts.length - 2] || parts[0];
    }
  }
  return '';
}

export function LeadsPage() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const { leads, total, loading, update, remove } = useLeads();
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => {
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('last_contact_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [pageSize, setPageSize] = useState(25);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const nameMatch  = l.business_name.toLowerCase().includes(q);
        const phoneMatch = l.phone?.includes(q);
        const cityMatch  = getDisplayCity(l).toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !cityMatch) return false;
      }
      return true;
    });
  }, [leads, statusFilter, search]);

  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'city') {
        aVal = getDisplayCity(a);
        bVal = getDisplayCity(b);
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    }).slice(0, pageSize);
  }, [filteredLeads, sortField, sortOrder, pageSize]);

  const handleUpdate = (id: string, updates: Partial<LeadRow>) => {
    update(id, updates);
    if (selectedLead?.id === id) setSelectedLead({ ...selectedLead, ...updates });
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    if (selectedLead?.id === id) setSelectedLead(null);
    setDeletingLeadId(null);
  };

  const selectedCount = useMemo(() => {
    return Object.values(selectedIds).filter(Boolean).length;
  }, [selectedIds]);

  const allSelected = sortedLeads.length > 0 && sortedLeads.every((l) => selectedIds[l.id]);
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      sortedLeads.forEach((l) => (next[l.id] = true));
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (idsToDelete.length === 0) return;

    setIsBulkDeleting(true);
    try {
      for (const id of idsToDelete) {
        await remove(id);
      }
      setSelectedIds({});
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to bulk delete leads:', err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans text-[#14161A] select-none bg-transparent">
      {/* Outer Shell Container */}
      <div className="bg-[#e8eaf0] rounded-[28px] p-6 lg:p-8 border border-[#d1d5db] shadow-xs space-y-5 animate-blur-fade-up">
        
        {/* TOP TOOLBAR (Above the table) */}
        <div className="flex items-center justify-between gap-4 pb-1">
          {/* Left: View Toggle */}
          <div className="flex items-center gap-0 bg-[#f4f5f8] rounded-lg border border-[#d1d5db] overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 text-[12px] font-medium flex items-center gap-1 transition-all cursor-pointer border-r border-[#d1d5db] ${
                viewMode === 'table' ? 'bg-white text-[#14161A]' : 'text-[#8A90A2] hover:text-[#4B5264] hover:bg-[#EDEFF3]'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 text-[12px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#14161A]' : 'text-[#8A90A2] hover:text-[#4B5264] hover:bg-[#EDEFF3]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Pagination Label */}
          <div className="flex items-center gap-2 text-[12px] text-[#374151] font-medium">
            <span>Showing</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-[#d1d5db] rounded-lg px-2 py-1 text-[12px] font-bold font-mono text-[#14161A] cursor-pointer outline-none shadow-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>of <strong className="font-mono text-[#14161A]">{total}</strong> results</span>
          </div>
        </div>

        {/* BULK ACTION TOOLBAR (Appears dynamically when 1+ leads are selected) */}
        {selectedCount > 0 && (
          <div className="bg-[#17192B] text-white px-5 py-3 rounded-[20px] shadow-lg flex items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#F0501E] text-white text-[12px] font-bold font-mono flex items-center justify-center shadow-xs">
                {selectedCount}
              </span>
              <span className="text-[13px] font-bold">
                {selectedCount} {selectedCount === 1 ? 'lead' : 'leads'} selected
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIds({})}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-4 py-1.5 rounded-full text-[12px] font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedCount})</span>
              </button>
            </div>
          </div>
        )}

        {/* SEARCH ROW (Below toolbar) */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#374151] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="quiet-input !pl-11 bg-[#f8f9fc] border-[#d1d5db] text-[#14161A] placeholder:text-[#6B7280] font-medium"
              placeholder="Search leads..."
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2 rounded-lg text-[12px] font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
              showFilters || statusFilter
                ? 'bg-[#14161A] text-white border-[#14161A]'
                : 'bg-transparent text-[#4B5264] border-[#d1d5db] hover:border-[#9CA3AF] hover:text-[#14161A]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </div>

        {/* Filter pills */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 animate-blur-fade-up pt-1">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                !statusFilter
                  ? 'bg-[#17192B] text-white border-[#17192B]'
                  : 'bg-[#f4f5f8] text-[#374151] border-[#d1d5db] hover:bg-[#e5e7ec]'
              }`}
            >
              All Stages
            </button>
            {LEAD_STATUSES.map((s) => (
              <LeadStatusBadge
                key={s}
                status={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              />
            ))}
          </div>
        )}

        {/* VIEW CONDITIONAL: TABLE VS GRID */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-blur-fade-up">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="ui-card space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-10 h-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <div className="skeleton h-4 w-32" />
                      <div className="skeleton h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))
            ) : sortedLeads.length === 0 ? (
              <div className="col-span-full text-center py-16 text-[#4B5264] text-display text-[20px] ui-card">
                {search || statusFilter ? 'No leads match your filters.' : 'No leads yet. Start by searching for businesses.'}
              </div>
            ) : (
              sortedLeads.map((lead, idx) => {
                const score = lead.interest_score || 0;
                const hasCategory = lead.category && lead.category !== 'Uncategorized';
                const lastActivity = lead.last_contact_at || lead.created_at;

                return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  style={{ animationDelay: `${idx * 20}ms` }}
                  className="ui-card-interactive flex flex-col justify-between h-full space-y-3.5 group animate-fade-rise hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full ${getAvatarTint(lead.business_name)} text-white font-bold text-sm flex items-center justify-center flex-shrink-0 font-mono mt-0.5`}>
                        {lead.business_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 min-h-[40px] flex flex-col justify-center">
                        <h4 className="font-bold text-[#14161A] text-[14px] line-clamp-2 leading-snug group-hover:text-[#F0501E] transition-colors" title={lead.business_name}>
                          {lead.business_name}
                        </h4>
                        {hasCategory && (
                          <span className="text-[10px] text-[#6B7280] font-medium mt-1 inline-block px-1.5 py-px bg-[#F4F5F8] rounded w-fit truncate max-w-[180px]">{lead.category}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 pt-0.5">
                      <LeadStatusBadge status={lead.status} />
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-[#E2E8F0] text-[12px] text-[#4B5264] mt-auto">
                    {lead.phone && (
                      <div className="flex items-center gap-2 font-mono text-[#14161A]">
                        <Phone className="w-3.5 h-3.5 text-[#8A90A2] flex-shrink-0" />
                        <span className="truncate">{lead.phone}</span>
                      </div>
                    )}
                    {getDisplayCity(lead) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#8A90A2] flex-shrink-0" />
                        <span className="truncate text-[#4B5264]">{getDisplayCity(lead)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {score > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[#E2E8F0] h-[5px] rounded-full overflow-hidden flex-shrink-0">
                          <div className="bg-[#F0501E] h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${score}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-[#8A90A2]">{score}%</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#8A90A2] italic">Not started</span>
                    )}
                    {lastActivity && (
                      <span className="text-[10px] text-[#8A90A2] font-mono">{timeAgo(lastActivity)}</span>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        ) : (
          /* CONTINUOUS DATA TABLE CONTAINER */
          <div className="bg-white rounded-[22px] border border-[#E2E8F0] overflow-hidden shadow-xs">
          {/* TABLE HEADER ROW */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3.5 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0] text-[11px] text-label text-[#4B5264] sticky top-0 z-10">
            {/* Checkbox Header */}
            <div className="col-span-1 flex items-center justify-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-[#F0501E] rounded cursor-pointer"
              />
            </div>
            {/* Lead */}
            <div className="col-span-3 flex items-center">
              <button onClick={() => handleSort('business_name')} className="flex items-center gap-1.5 hover:text-[#14161A] cursor-pointer font-bold transition-colors">
                <span>Lead</span>
                {sortField === 'business_name' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#F0501E]" /> : <ArrowDown className="w-3 h-3 text-[#F0501E]" />)}
              </button>
            </div>
            {/* Phone */}
            <div className="col-span-2 flex items-center">
              <button onClick={() => handleSort('phone')} className="flex items-center gap-1.5 hover:text-[#14161A] cursor-pointer font-bold transition-colors">
                <span>Phone</span>
                {sortField === 'phone' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#F0501E]" /> : <ArrowDown className="w-3 h-3 text-[#F0501E]" />)}
              </button>
            </div>
            {/* Location */}
            <div className="col-span-2 flex items-center">
              <button onClick={() => handleSort('city')} className="flex items-center gap-1.5 hover:text-[#14161A] cursor-pointer font-bold transition-colors">
                <span>Location</span>
                {sortField === 'city' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#F0501E]" /> : <ArrowDown className="w-3 h-3 text-[#F0501E]" />)}
              </button>
            </div>
            {/* Progress */}
            <div className="col-span-2 flex items-center">
              <button onClick={() => handleSort('interest_score')} className="flex items-center gap-1.5 hover:text-[#14161A] cursor-pointer font-bold transition-colors">
                <span>Progress</span>
                {sortField === 'interest_score' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#F0501E]" /> : <ArrowDown className="w-3 h-3 text-[#F0501E]" />)}
              </button>
            </div>
            {/* Status */}
            <div className="col-span-1 flex items-center">
              <span>Status</span>
            </div>
            {/* Actions / Last Contact */}
            <div className="col-span-1 flex items-center justify-end">
              <span>Actions</span>
            </div>
          </div>

          {/* TABLE BODY */}
          <div className="divide-y divide-[#E2E8F0]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between min-h-[56px]">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-9 h-9 rounded-full" />
                    <div className="space-y-1.5">
                      <div className="skeleton h-4 w-40" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))
            ) : sortedLeads.length === 0 ? (
              <div className="text-center py-16 text-[#4B5264] text-display text-[20px] bg-white">
                {search || statusFilter ? 'No leads match your filters.' : 'No leads yet. Start by searching for businesses.'}
              </div>
            ) : (
              sortedLeads.map((lead, idx) => {
                const displayCity = getDisplayCity(lead);
                const isSelected = !!selectedIds[lead.id];
                const score = lead.interest_score || 0;
                const hasCategory = lead.category && lead.category !== 'Uncategorized';

                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    style={{ animationDelay: `${idx * 20}ms` }}
                    className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-center min-h-[60px] px-4 py-2.5 cursor-pointer transition-colors duration-150 group animate-fade-rise text-[#14161A] ${
                      isSelected ? 'bg-[#FDEDE7]/30' : 'hover:bg-[#F8F9FC]'
                    }`}
                  >
                    {/* Col 1: Checkbox */}
                    <div className="col-span-1 flex items-center justify-center my-auto" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(lead.id)}
                        className="w-4 h-4 accent-[#F0501E] rounded cursor-pointer"
                      />
                    </div>

                    {/* Col 2 "Lead": Circular Avatar + Bold Name + Category Tag */}
                    <div className="col-span-3 flex items-center gap-3 min-w-0 h-full my-auto">
                      <div className={`w-8 h-8 rounded-full ${getAvatarTint(lead.business_name)} text-white font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono`}>
                        {lead.business_name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-[#14161A] group-hover:text-[#F0501E] transition-colors truncate" title={lead.business_name}>
                          {lead.business_name}
                        </div>
                        {hasCategory && (
                          <span className="text-[10px] text-[#6B7280] font-medium truncate block max-w-[200px] mt-0.5">
                            {lead.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Col 3 "Phone": Phone Number in Mono */}
                    <div className="col-span-2 text-[12px] text-[#4B5264] font-mono flex items-center gap-1.5 truncate my-auto">
                      <Phone className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" />
                      <span className="truncate">{lead.phone || <span className="text-[#9CA3AF] italic font-sans text-[11px]">—</span>}</span>
                    </div>

                    {/* Col 4 "Location": City / State */}
                    <div className="col-span-2 text-[12px] text-[#4B5264] font-medium flex items-center gap-1.5 truncate my-auto">
                      <MapPin className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" />
                      <span className="truncate">{displayCity || <span className="text-[#9CA3AF] italic font-sans text-[11px]">—</span>}</span>
                    </div>

                    {/* Col 5 "Progress": Proper thin track or "Not started" */}
                    <div className="col-span-2 flex items-center gap-2 my-auto">
                      {score > 0 ? (
                        <>
                          <div className="w-20 bg-[#E2E8F0] h-[5px] rounded-full overflow-hidden hidden sm:block flex-shrink-0">
                            <div
                              className="bg-[#F0501E] h-full rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-[#8A90A2] min-w-[28px]">{score}%</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-[#9CA3AF] italic">Not started</span>
                      )}
                    </div>

                    {/* Col 6 "Status": Dot + label */}
                    <div className="col-span-1 flex items-center my-auto">
                      <LeadStatusBadge status={lead.status} />
                    </div>

                    {/* Col 7 "Last Contact & Actions" — muted until hover */}
                    <div className="col-span-1 flex items-center justify-end gap-2 my-auto">
                      <span className="text-[10px] text-[#9CA3AF] font-mono truncate hidden lg:inline">
                        {timeAgo(lead.last_contact_at || lead.created_at)}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingLeadId(lead.id);
                          }}
                          className="p-1 rounded-md text-[#C4C8D4] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-[#C4C8D4] group-hover:text-[#F0501E] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      </div>

      {/* Quick Delete Confirmation Modal */}
      {deletingLeadId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-[#d1d5db] text-[#14161A]">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-[16px] font-bold">Delete Lead</div>
            </div>
            <p className="text-[13px] text-[#374151] font-medium leading-relaxed">
              Are you sure you want to delete this lead? This will permanently delete the lead record.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingLeadId(null)}
                className="px-4 py-2 rounded-full text-[12px] text-[#374151] hover:bg-gray-100 transition-colors font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingLeadId)}
                className="px-5 py-2 rounded-full text-[12px] font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-md cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-[#d1d5db] text-[#14161A]">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-[16px] font-bold">Delete Selected Leads</div>
            </div>
            <p className="text-[13px] text-[#374151] font-medium leading-relaxed">
              Are you sure you want to delete <strong className="text-[#14161A] font-bold">{selectedCount}</strong> selected leads? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-full text-[12px] text-[#374151] hover:bg-gray-100 transition-colors font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-5 py-2 rounded-full text-[12px] font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-md cursor-pointer flex items-center gap-2"
              >
                {isBulkDeleting ? 'Deleting...' : `Delete ${selectedCount} Leads`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedLead && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-fade-in" onClick={() => setSelectedLead(null)} />
          <LeadDetailPanel
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}
