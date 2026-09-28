import { useState, useMemo, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
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
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';
import { useLeads, useLeadMutations } from '@/hooks/useLeads';
import { useDialog } from '@/hooks/useDialog';
import { LeadStatusBadge } from './LeadStatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/constants';
import { errorMessage, timeAgo, toExternalUrl } from '@/lib/utils';
import type { Lead } from '@/types/database';

type SortField = 'business_name' | 'phone' | 'city' | 'interest_score' | 'last_contact_at';

/* ── Deterministic avatar tint palette (8 muted, on-brand tones) ── */
const AVATAR_TINTS = ['bg-[#2D3047]', 'bg-[#3B3F5C]', 'bg-[#4A3F5C]', 'bg-[#5C3D3D]', 'bg-[#3D4F5C]', 'bg-[#5C4A3D]', 'bg-[#3D5C4A]', 'bg-[#5C3D4F]'];

function getAvatarTint(name: string): string {
  return AVATAR_TINTS[(name.charCodeAt(0) || 0) % AVATAR_TINTS.length];
}


function getDisplayCity(lead: Lead): string {
  if (lead.city?.trim()) return lead.city.trim();
  const parts = (lead.address ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 4) return parts[parts.length - 3]; // "street, City, State ZIP, Country"
  return parts.length >= 2 ? parts[parts.length - 2] : '';
}

function LeadDetailPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { update, remove } = useLeadMutations();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [notes, setNotes] = useState(lead.notes || '');
  const [score, setScore] = useState(lead.interest_score || 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  useDialog(panelRef, !confirmDelete, onClose);

  // Follow remote edits (realtime) unless the user is mid-edit.
  const notesDirty = notes !== (lead.notes || '');
  useEffect(() => {
    if (!notesDirty) setNotes(lead.notes || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.notes]);
  useEffect(() => setScore(lead.interest_score || 0), [lead.interest_score]);

  const save = (updates: Partial<Lead>, onDone?: () => void) =>
    update.mutate({ id: lead.id, updates }, { onSuccess: onDone });

  const saveNotes = () => {
    if (!notesDirty) return;
    setNotesSaved(false);
    save({ notes: notes || null }, () => setNotesSaved(true));
  };

  const commitScore = () => {
    if (score !== (lead.interest_score || 0)) save({ interest_score: score });
  };

  const handleDelete = () =>
    remove.mutate([lead.id], {
      onSuccess: () => {
        setConfirmDelete(false);
        onClose();
      },
    });

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-[#d1d5db] z-50 flex flex-col animate-drawer-slide shadow-2xl font-sans text-[#14161A] sm:rounded-l-[28px] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-[#d1d5db] bg-[#e8eaf0] flex-shrink-0">
          <div className="eyebrow text-[#374151] font-bold">Lead details</div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close lead details">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-full ${getAvatarTint(lead.business_name)} text-white font-bold text-lg flex items-center justify-center shadow-sm font-mono flex-shrink-0`} aria-hidden="true">
                {lead.business_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 id={titleId} className="text-2xl leading-tight font-display font-bold text-[#14161A] break-words">{lead.business_name}</h2>
                {lead.category && <div className="text-[13px] text-[#374151] font-semibold">{lead.category}</div>}
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 bg-[#f4f5f8] p-4 rounded-[20px] border border-[#d1d5db] text-[13px]">
              {lead.phone && (
                <div className="flex items-center gap-2.5">
                  <dt><Phone className="w-4 h-4 text-[#B93A0E]" aria-label="Phone" /></dt>
                  <dd><a href={`tel:${lead.phone}`} className="font-mono font-bold hover:underline">{lead.phone}</a></dd>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <dt><Mail className="w-4 h-4 text-[#B93A0E]" aria-label="Email" /></dt>
                  <dd className="min-w-0"><a href={`mailto:${lead.email}`} className="font-mono font-bold truncate block hover:underline" title={lead.email}>{lead.email}</a></dd>
                </div>
              )}
              {lead.address && (
                <div className="flex items-start gap-2.5 text-[#374151] font-medium">
                  <dt><MapPin className="w-4 h-4 text-[#4B5264] flex-shrink-0 mt-0.5" aria-label="Address" /></dt>
                  <dd>{lead.address}</dd>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <dt><Globe className="w-4 h-4 text-[#4B5264] flex-shrink-0" aria-label="Website" /></dt>
                  <dd className="min-w-0">
                    <a href={toExternalUrl(lead.website)} target="_blank" rel="noopener noreferrer" className="text-[#B93A0E] hover:underline font-bold truncate block">
                      {lead.website}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              )}
              {lead.linkedin_url && (
                <div className="flex items-center gap-2.5">
                  <dt><ExternalLink className="w-4 h-4 text-[#0A66C2] flex-shrink-0" aria-label="LinkedIn" /></dt>
                  <dd>
                    <a href={toExternalUrl(lead.linkedin_url)} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:underline font-bold">
                      LinkedIn profile<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              )}
              {lead.rating != null && (
                <div className="flex items-center gap-2.5 text-[#374151]">
                  <dt><Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-label="Rating" /></dt>
                  <dd className="font-bold text-[#14161A]">{lead.rating} rating</dd>
                </div>
              )}
            </dl>
          </div>

          {update.isError && (
            <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-[12px] font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />
              <span>Change not saved: {errorMessage(update.error)}</span>
            </div>
          )}

          <fieldset className="space-y-3">
            <legend className="eyebrow text-[#374151] font-bold mb-3">Pipeline status</legend>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map((s) => (
                <LeadStatusBadge key={s} status={s} active={lead.status === s} onClick={() => lead.status !== s && save({ status: s })} />
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor={`${titleId}-score`} className="eyebrow text-[#374151] font-bold">Interest score</label>
              <span className="font-mono text-[12px] font-bold text-[#14161A]">{score}%</span>
            </div>
            <input
              id={`${titleId}-score`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              onPointerUp={commitScore}
              onKeyUp={commitScore}
              onBlur={commitScore}
              className="w-full accent-[#D44314] cursor-pointer"
            />
          </div>

          {lead.ai_summary && (
            <div className="space-y-2">
              <div className="eyebrow text-[#374151] font-bold">AI summary</div>
              <div className="bg-[#f4f5f8] rounded-[20px] p-4 text-[13px] text-[#374151] font-medium leading-relaxed border border-[#d1d5db]">{lead.ai_summary}</div>
              <div className="flex gap-2 mt-2">
                {lead.ai_intent && <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#d1d5db] text-[#14161A] font-mono font-bold">{lead.ai_intent}</span>}
                {lead.ai_sentiment && <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#d1d5db] text-[#374151] font-mono font-medium">{lead.ai_sentiment}</span>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor={`${titleId}-notes`} className="eyebrow text-[#374151] font-bold block">Internal notes</label>
            <textarea
              id={`${titleId}-notes`}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesSaved(false);
              }}
              onBlur={saveNotes}
              placeholder="Add notes about this lead..."
              rows={4}
              className="ui-input resize-y"
            />
            <div className="flex items-center justify-end gap-3 min-h-8" aria-live="polite">
              {notesSaved && !notesDirty && (
                <span className="text-[12px] text-emerald-700 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Saved
                </span>
              )}
              <button type="button" onClick={saveNotes} disabled={!notesDirty || update.isPending} className="btn-secondary !py-1.5 !px-4 !text-[12px]">
                {update.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                Save notes
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#d1d5db]">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] text-red-700 hover:bg-red-50 transition-colors font-bold border border-red-200 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>Delete lead</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete lead"
        confirmLabel="Delete"
        busy={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
        onConfirm={handleDelete}
        onCancel={() => {
          remove.reset();
          setConfirmDelete(false);
        }}
      >
        Permanently delete <strong className="text-[#14161A]">{lead.business_name}</strong> and its conversation history? This cannot be undone.
      </ConfirmDialog>
    </>,
    document.body
  );
}

function SortHeader({ field, label, sortField, sortOrder, onSort }: { field: SortField; label: string; sortField: SortField; sortOrder: 'asc' | 'desc'; onSort: (f: SortField) => void }) {
  const active = sortField === field;
  return (
    <button type="button" onClick={() => onSort(field)} className="flex items-center gap-1.5 hover:text-[#14161A] cursor-pointer font-bold uppercase transition-colors" aria-label={`Sort by ${label}`}>
      <span>{label}</span>
      {active && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#B93A0E]" aria-hidden="true" /> : <ArrowDown className="w-3 h-3 text-[#B93A0E]" aria-hidden="true" />)}
    </button>
  );
}

function ScoreBar({ score }: { score: number }) {
  if (score <= 0) return <span className="text-[11px] text-[#4B5264] italic">Not started</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="w-16 bg-[#E2E8F0] h-[5px] rounded-full overflow-hidden flex-shrink-0" aria-hidden="true">
        <span className="block bg-[#F0501E] h-full rounded-full" style={{ width: `${Math.min(score, 100)}%`, minWidth: 5 }} />
      </span>
      <span className="text-[11px] font-mono text-[#4B5264]">{score}%</span>
    </span>
  );
}

export function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const { leads, loading, error, refetch } = useLeads();
  const { remove } = useLeadMutations();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [sortField, setSortField] = useState<SortField>('last_contact_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Header search (/leads?search=...) updates the box even when already on this page.
  useEffect(() => setSearch(urlSearch), [urlSearch]);
  useEffect(() => setPage(0), [search, statusFilter, pageSize, sortField, sortOrder]);

  const selectedLead = selectedLeadId ? leads.find((l) => l.id === selectedLeadId) ?? null : null;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortOrder(field === 'business_name' || field === 'city' ? 'asc' : 'desc');
    }
  };

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.business_name.toLowerCase().includes(q) ||
        (l.phone ?? '').includes(q) ||
        (l.email ?? '').toLowerCase().includes(q) ||
        (l.category ?? '').toLowerCase().includes(q) ||
        getDisplayCity(l).toLowerCase().includes(q)
      );
    });
  }, [leads, statusFilter, search]);

  const sortedLeads = useMemo(() => {
    const value = (l: Lead) => (sortField === 'city' ? getDisplayCity(l) || null : l[sortField]);
    return [...filteredLeads].sort((a, b) => {
      let av = value(a);
      let bv = value(b);
      if (av == null || av === '') return 1;
      if (bv == null || bv === '') return -1;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLeads, sortField, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(sortedLeads.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageLeads = sortedLeads.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  // Ignore selections for leads that no longer exist (deleted elsewhere).
  const liveSelected = useMemo(() => leads.filter((l) => selectedIds.has(l.id)).map((l) => l.id), [leads, selectedIds]);
  const allSelected = pageLeads.length > 0 && pageLeads.every((l) => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageLeads.forEach((l) => (allSelected ? next.delete(l.id) : next.add(l.id)));
      return next;
    });
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const deletingLead = deletingLeadId ? leads.find((l) => l.id === deletingLeadId) : null;

  const runDelete = (ids: string[], onDone: () => void) =>
    remove.mutate(ids, {
      onSuccess: () => {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        onDone();
      },
    });

  const clearUrlSearch = () => {
    setSearch('');
    if (urlSearch) setSearchParams({}, { replace: true });
  };

  const emptyMessage = search || statusFilter ? 'No leads match your filters.' : 'No leads yet.';

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans text-[#14161A]">
      <div className="bg-[#e8eaf0] rounded-[28px] p-4 sm:p-6 lg:p-8 border border-[#d1d5db] shadow-xs space-y-5 animate-blur-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-display text-[28px] text-[#14161A]">Leads</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-[#f4f5f8] rounded-lg border border-[#d1d5db] overflow-hidden" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                aria-label="Table view"
                className={`px-3 py-2 flex items-center transition-all cursor-pointer border-r border-[#d1d5db] ${viewMode === 'table' ? 'bg-white text-[#14161A]' : 'text-[#4B5264] hover:bg-[#EDEFF3]'}`}
              >
                <List className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
                className={`px-3 py-2 flex items-center transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-[#14161A]' : 'text-[#4B5264] hover:bg-[#EDEFF3]'}`}
              >
                <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[#374151] font-medium">
              <label htmlFor="leads-page-size">Per page</label>
              <select
                id="leads-page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-[#d1d5db] rounded-lg px-2 py-1.5 text-[12px] font-bold font-mono text-[#14161A] cursor-pointer shadow-xs"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {liveSelected.length > 0 && (
          <div className="bg-[#17192B] text-white px-4 sm:px-5 py-3 rounded-[20px] shadow-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <span className="text-[13px] font-bold" aria-live="polite">
              {liveSelected.length} {liveSelected.length === 1 ? 'lead' : 'leads'} selected
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-full text-[12px] font-bold text-white/90 hover:text-white hover:bg-white/10 cursor-pointer focus-ring-light">
                Clear
              </button>
              <button type="button" onClick={() => setShowBulkDeleteConfirm(true)} className="px-4 py-1.5 rounded-full text-[12px] font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 cursor-pointer focus-ring-light">
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Delete ({liveSelected.length})
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <label htmlFor="leads-search" className="sr-only">Search leads</label>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#374151] pointer-events-none" aria-hidden="true" />
            <input
              id="leads-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="quiet-input !pl-11 !pr-10 font-medium"
              placeholder="Search name, phone, email, city..."
            />
            {search && (
              <button type="button" onClick={clearUrlSearch} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon" aria-label="Clear search">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="leads-status-filters"
            className={`px-3.5 py-2.5 rounded-full text-[12px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showFilters || statusFilter ? 'bg-[#14161A] text-white border-[#14161A]' : 'bg-white text-[#374151] border-[#d1d5db] hover:border-[#9CA3AF]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Filter{statusFilter ? ' (1)' : ''}</span>
          </button>
        </div>

        {showFilters && (
          <div id="leads-status-filters" role="group" aria-label="Filter by status" className="flex flex-wrap gap-2 animate-fade-in">
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              aria-pressed={!statusFilter}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${!statusFilter ? 'bg-[#17192B] text-white border-[#17192B]' : 'bg-[#f4f5f8] text-[#374151] border-[#d1d5db] hover:bg-[#e5e7ec]'}`}
            >
              All stages
            </button>
            {LEAD_STATUSES.map((s) => (
              <LeadStatusBadge key={s} status={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)} />
            ))}
          </div>
        )}

        {error ? (
          <div role="alert" className="bg-white border border-red-200 rounded-[22px] p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" aria-hidden="true" />
            <p className="text-[14px] font-bold text-[#14161A]">Could not load your leads</p>
            <p className="text-[12px] text-[#4B5264]">{errorMessage(error)}</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary">Try again</button>
          </div>
        ) : viewMode === 'grid' ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="ui-card space-y-3" aria-hidden="true">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-10 h-10 !rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <div className="skeleton h-4 w-32" />
                      <div className="skeleton h-3 w-20" />
                    </div>
                  </div>
                </li>
              ))
            ) : pageLeads.length === 0 ? (
              <li className="col-span-full"><EmptyLeads message={emptyMessage} showCta={!search && !statusFilter} /></li>
            ) : (
              pageLeads.map((lead) => {
                const city = getDisplayCity(lead);
                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="ui-card-interactive w-full text-left flex flex-col justify-between h-full gap-3.5 group hover:-translate-y-0.5"
                    >
                      <span className="flex items-start justify-between gap-3 w-full">
                        <span className="flex items-start gap-3 min-w-0 flex-1">
                          <span className={`w-10 h-10 rounded-full ${getAvatarTint(lead.business_name)} text-white font-bold text-sm flex items-center justify-center flex-shrink-0 font-mono`} aria-hidden="true">
                            {lead.business_name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold text-[#14161A] text-[14px] line-clamp-2 leading-snug group-hover:text-[#B93A0E]">{lead.business_name}</span>
                            {lead.category && <span className="text-[11px] text-[#4B5264] font-medium mt-1 inline-block px-1.5 py-px bg-[#F4F5F8] rounded truncate max-w-[180px]">{lead.category}</span>}
                          </span>
                        </span>
                        <LeadStatusBadge status={lead.status} />
                      </span>
                      <span className="block space-y-2 pt-3 border-t border-[#E2E8F0] text-[12px] text-[#4B5264] w-full">
                        {lead.phone && (
                          <span className="flex items-center gap-2 font-mono text-[#14161A]">
                            <Phone className="w-3.5 h-3.5 text-[#4B5264] flex-shrink-0" aria-hidden="true" />
                            <span className="truncate">{lead.phone}</span>
                          </span>
                        )}
                        {city && (
                          <span className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#4B5264] flex-shrink-0" aria-hidden="true" />
                            <span className="truncate">{city}</span>
                          </span>
                        )}
                      </span>
                      <span className="flex items-center justify-between w-full">
                        <ScoreBar score={lead.interest_score || 0} />
                        <span className="text-[11px] text-[#4B5264] font-mono">{timeAgo(lead.last_contact_at || lead.created_at)}</span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : (
          <div className="bg-white rounded-[22px] border border-[#E2E8F0] overflow-hidden shadow-xs" role="table" aria-label="Leads" aria-rowcount={sortedLeads.length}>
            <div role="row" className="hidden md:grid grid-cols-12 gap-3 px-4 py-3.5 bg-white border-b border-[#E2E8F0] text-[11px] text-label text-[#374151]">
              <div role="columnheader" className="col-span-1 flex items-center justify-center">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Select all leads on this page" className="w-4 h-4 accent-[#D44314] cursor-pointer" />
              </div>
              <div role="columnheader" className="col-span-3 flex items-center"><SortHeader field="business_name" label="Lead" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} /></div>
              <div role="columnheader" className="col-span-2 flex items-center"><SortHeader field="phone" label="Phone" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} /></div>
              <div role="columnheader" className="col-span-2 flex items-center"><SortHeader field="city" label="Location" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} /></div>
              <div role="columnheader" className="col-span-2 flex items-center"><SortHeader field="interest_score" label="Interest" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} /></div>
              <div role="columnheader" className="col-span-1 flex items-center font-bold">Status</div>
              <div role="columnheader" className="col-span-1 flex items-center justify-end"><SortHeader field="last_contact_at" label="Last" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} /></div>
            </div>

            <div className="divide-y divide-[#E2E8F0]" role="rowgroup">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-3 min-h-[56px]" aria-hidden="true">
                    <div className="skeleton w-9 h-9 !rounded-full" />
                    <div className="space-y-1.5">
                      <div className="skeleton h-4 w-40" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                  </div>
                ))
              ) : pageLeads.length === 0 ? (
                <div role="row"><div role="cell"><EmptyLeads message={emptyMessage} showCta={!search && !statusFilter} /></div></div>
              ) : (
                pageLeads.map((lead) => {
                  const city = getDisplayCity(lead);
                  const isSelected = selectedIds.has(lead.id);
                  return (
                    <div
                      key={lead.id}
                      role="row"
                      aria-selected={isSelected}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`flex flex-wrap md:grid md:grid-cols-12 gap-x-3 gap-y-1.5 items-center min-h-[60px] px-4 py-3 md:py-2.5 cursor-pointer transition-colors group ${isSelected ? 'bg-[#FDEDE7]/40' : 'hover:bg-[#F8F9FC]'}`}
                    >
                      <div role="cell" className="md:col-span-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)} aria-label={`Select ${lead.business_name}`} className="w-4 h-4 accent-[#D44314] cursor-pointer" />
                      </div>
                      <div role="cell" className="md:col-span-3 flex items-center gap-3 min-w-0 flex-1 md:flex-none">
                        <span className={`w-8 h-8 rounded-full ${getAvatarTint(lead.business_name)} text-white font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono`} aria-hidden="true">
                          {lead.business_name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeadId(lead.id);
                            }}
                            className="block max-w-full text-left text-[13px] font-semibold text-[#14161A] group-hover:text-[#B93A0E] truncate cursor-pointer"
                            title={lead.business_name}
                          >
                            {lead.business_name}
                          </button>
                          {lead.category && <span className="text-[11px] text-[#4B5264] font-medium truncate block max-w-[200px]">{lead.category}</span>}
                        </span>
                      </div>
                      <div role="cell" className="md:col-span-2 text-[12px] text-[#374151] font-mono flex items-center gap-1.5 min-w-0 w-full md:w-auto pl-7 md:pl-0 order-3 md:order-none">
                        <Phone className="w-3.5 h-3.5 text-[#4B5264] flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{lead.phone || lead.email || '—'}</span>
                      </div>
                      <div role="cell" className="hidden md:flex md:col-span-2 text-[12px] text-[#374151] font-medium items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#4B5264] flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{city || '—'}</span>
                      </div>
                      <div role="cell" className="hidden md:flex md:col-span-2 items-center"><ScoreBar score={lead.interest_score || 0} /></div>
                      <div role="cell" className="md:col-span-1 flex items-center"><LeadStatusBadge status={lead.status} /></div>
                      <div role="cell" className="hidden md:flex md:col-span-1 items-center justify-end gap-1">
                        <span className="text-[11px] text-[#4B5264] font-mono truncate hidden xl:inline">{timeAgo(lead.last_contact_at || lead.created_at)}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove.reset();
                            setDeletingLeadId(lead.id);
                          }}
                          className="btn-icon text-[#6B7280] hover:!text-red-700 hover:!bg-red-50 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label={`Delete ${lead.business_name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#B93A0E]" aria-hidden="true" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {!loading && !error && sortedLeads.length > 0 && (
          <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#374151] font-medium">
            <span>
              Showing <strong className="font-mono text-[#14161A]">{currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sortedLeads.length)}</strong> of{' '}
              <strong className="font-mono text-[#14161A]">{sortedLeads.length}</strong>
              {sortedLeads.length !== leads.length && <> (filtered from {leads.length})</>}
            </span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0} className="btn-secondary !py-1.5 !px-3" aria-label="Previous page">
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="font-mono">Page {currentPage + 1} / {pageCount}</span>
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1} className="btn-secondary !py-1.5 !px-3" aria-label="Next page">
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </span>
          </nav>
        )}
      </div>

      <ConfirmDialog
        open={!!deletingLead}
        title="Delete lead"
        confirmLabel="Delete"
        busy={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
        onConfirm={() => deletingLead && runDelete([deletingLead.id], () => setDeletingLeadId(null))}
        onCancel={() => setDeletingLeadId(null)}
      >
        Permanently delete <strong className="text-[#14161A]">{deletingLead?.business_name}</strong> and its conversation history? This cannot be undone.
      </ConfirmDialog>

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        title="Delete selected leads"
        confirmLabel={`Delete ${liveSelected.length} leads`}
        busy={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
        onConfirm={() => runDelete(liveSelected, () => setShowBulkDeleteConfirm(false))}
        onCancel={() => {
          remove.reset();
          setShowBulkDeleteConfirm(false);
        }}
      >
        Permanently delete <strong className="text-[#14161A]">{liveSelected.length}</strong> selected leads and their conversations? This cannot be undone.
      </ConfirmDialog>

      {selectedLead && <LeadDetailPanel key={selectedLead.id} lead={selectedLead} onClose={() => setSelectedLeadId(null)} />}
    </div>
  );
}

function EmptyLeads({ message, showCta }: { message: string; showCta: boolean }) {
  return (
    <div className="text-center py-14 px-4 space-y-3">
      <p className="text-display text-[20px] text-[#374151]">{message}</p>
      {showCta && (
        <Link to="/search" className="btn-primary">
          <Search className="w-4 h-4" aria-hidden="true" />
          Discover leads
        </Link>
      )}
    </div>
  );
}
