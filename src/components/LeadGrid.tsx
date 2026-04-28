import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getLeads, addLead, importCsvBatch, updateLead, bulkDeleteLeads, bulkUpdateStatus, Lead } from "../lib/db";
import { ghostSyncPrompt } from "../lib/ghostSync";
import { useVirtualizer } from "@tanstack/react-virtual";
import Papa from "papaparse";
import { 
  Plus, 
  Search, 
  FileUp,
  Sparkles,
  Loader2,
  X,
  CheckCircle2,
  Filter,
  Trash2,
  ArrowRightLeft,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronDown,
  Calendar
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";

export function LeadGrid({ onSelectRecord }: { onSelectRecord: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isEnriching, setIsEnriching] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [duplicateResolution, setDuplicateResolution] = useState<{ batch: any[]; duplicates: any[]; } | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [heartbeat, setHeartbeat] = useState<"connecting" | "active" | "failed">("connecting");
  const [vaultReady, setVaultReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);

  const [newLead, setNewLead] = useState({ 
    name: "", 
    email: "", 
    company: "", 
    status: "New"
  });

  useEffect(() => {
    const checkConn = async () => {
      try {
        await invoke("ping_vault");
        setHeartbeat("active");
        setVaultReady(true);
      } catch (e) {
        setHeartbeat("failed");
      }
    };
    checkConn();
    const interval = setInterval(checkConn, 10000);

    const unlisten = listen("vault-ready", () => {
      console.log("AXON: Vault Ready Event Received");
      setVaultReady(true);
      setHeartbeat("active");
    });

    return () => {
      clearInterval(interval);
      unlisten.then(f => f());
    };
  }, []);

  const { data: leads, isLoading, error } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      return await getLeads();
    },
    enabled: vaultReady,
    retry: 5,
    retryDelay: (attempt) => Math.min(attempt * 1000, 5000),
  });

  // Helper to extract company name from a lead (with metadata fallback)
  const getLeadCompany = (l: Lead): string => {
    if (l.company?.trim()) return l.company.trim();
    try {
      const md = JSON.parse(l.metadata || '{}');
      return md.company || md.Company || md['Company Name'] || md.Organization || '';
    } catch { return ''; }
  };

  // Derive unique companies & statuses for filter dropdowns
  const uniqueCompanies = useMemo(() => {
    if (!leads) return [];
    const set = new Set<string>();
    leads.forEach(l => { const c = getLeadCompany(l); if (c) set.add(c); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const uniqueStatuses = useMemo(() => {
    if (!leads) return [];
    const set = new Set<string>();
    leads.forEach(l => { if (l.status) set.add(l.status); });
    return Array.from(set).sort();
  }, [leads]);

  // Date filter helper
  const passesDateFilter = (createdAt: string) => {
    if (dateFilter === 'all') return true;
    const d = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (dateFilter === '7d') return diffDays <= 7;
    if (dateFilter === '30d') return diffDays <= 30;
    if (dateFilter === '90d') return diffDays <= 90;
    return true;
  };

  const filteredLeads = leads?.filter(l => {
    const matchesSearch = `${l.name}`.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      getLeadCompany(l).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchesCompany = companyFilter === 'all' || getLeadCompany(l) === companyFilter;
    const matchesDate = passesDateFilter(l.created_at);
    return matchesSearch && matchesStatus && matchesCompany && matchesDate;
  }) || [];

  // Selection helpers
  const allVisibleSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l.id));
  const someVisibleSelected = filteredLeads.some(l => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} lead(s)? This cannot be undone.`)) return;
    setIsBulkActing(true);
    try {
      await bulkDeleteLeads(Array.from(selectedIds));
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (e: any) {
      alert('Bulk delete failed: ' + e);
    }
    setIsBulkActing(false);
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    setIsBulkActing(true);
    try {
      await bulkUpdateStatus(Array.from(selectedIds), newStatus);
      setSelectedIds(new Set());
      setShowBulkStatusMenu(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (e: any) {
      alert('Bulk status update failed: ' + e);
    }
    setIsBulkActing(false);
  };

  const activeFilterCount = [statusFilter !== 'all', companyFilter !== 'all', dateFilter !== 'all'].filter(Boolean).length;

  const rowVirtualizer = useVirtualizer({
    count: filteredLeads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 10,
  });

  const addLeadMutation = useMutation({
    mutationFn: async (lead: typeof newLead) => {
      return await addLead(lead.name, lead.email, lead.company, lead.status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowAddModal(false);
      setNewLead({ 
        name: "", 
        email: "", 
        company: "", 
        status: "New"
      });
    },
    onError: (err: any) => alert("Failed to add lead: " + err)
  });

  const enrichLead = async (lead: Lead) => {
    setIsEnriching(lead.id);
    try {
      const prompt = `Lead: ${lead.name}, email ${lead.email}, company ${lead.company || 'unknown'}. Provide a professional summary and sector. Return ONLY JSON: {"sector": "...", "summary": "..."}`;
      const aiResult = await ghostSyncPrompt(prompt);
      
      let data;
      try {
          data = typeof aiResult === "string" ? JSON.parse(aiResult) : aiResult;
      } catch (e) {
          const match = aiResult.match(/\{.*\}/s);
          if (match) data = JSON.parse(match[0]);
          else data = { sector: "Unknown", summary: "Summary generated." };
      }

      // Store AI enrichment in metadata, don't overwrite company name
      let oldMetadata: Record<string, any> = {};
      try { oldMetadata = JSON.parse(lead.metadata || '{}'); } catch (e) {}
      const enrichedMetadata = JSON.stringify({
        ...oldMetadata,
        _ai_sector: data.sector || "Unknown",
        _ai_summary: data.summary || "",
      });

      const updates: any = { metadata: enrichedMetadata };
      // Only set company from AI if it was empty/missing
      if (!lead.company || lead.company.trim() === "") {
        updates.company = data.sector || "General";
      }

      await updateLead(lead.id, updates);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnriching(null);
    }
  };

  const doImport = async (finalBatch: any[], duplicateUpdates: any[]) => {
     setIsImporting(true);
     try {
       if (finalBatch.length > 0) {
         await importCsvBatch(finalBatch);
       }
       for (const update of duplicateUpdates) {
          const { existing, updated, row } = update;
          let oldMetadata: Record<string, any> = {};
          try { 
            if (existing.metadata) {
              oldMetadata = JSON.parse(existing.metadata);
            }
          } catch (e) {}
          
          // Merge metadata, keeping existing keys but allowing row to overwrite/add
          const newMetadata = JSON.stringify({ ...oldMetadata, ...row });
          
          // Update strategy: If CSV has non-empty data, use it. Otherwise keep existing.
          const mergedName = (updated.name && updated.name !== "Unknown") ? updated.name : existing.name;
          const mergedEmail = updated.email || existing.email;
          const mergedCompany = updated.company || existing.company;
          const mergedStatus = updated.status !== "New" ? updated.status : existing.status;
          
          await updateLead(existing.id, {
             name: mergedName,
             email: mergedEmail,
             company: mergedCompany,
             status: mergedStatus,
             metadata: newMetadata
          });
       }
       
       alert(`Import Complete. ${finalBatch.length} records added, ${duplicateUpdates.length} records updated.`);
       queryClient.invalidateQueries({ queryKey: ["leads"] });
     } catch (e) {
       alert("CSV Import failed: " + e);
     } finally {
       setIsImporting(false);
       setDuplicateResolution(null);
     }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: async (results) => {
        const rows = results.data as any[];
        setImportProgress({ current: 0, total: rows.length });
        
        let batch = [];
        let duplicateBatch = [];
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          // Normalize keys for internal lookup but keep original row for metadata
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach(k => {
            normalizedRow[k.trim().toLowerCase()] = row[k];
          });

          // Extraction logic
          const email = normalizedRow.email || normalizedRow['e-mail'] || normalizedRow['email address'] || normalizedRow.email_address || "";
          const fName = normalizedRow.firstname || normalizedRow.first_name || normalizedRow['first name'] || "";
          const lName = normalizedRow.lastname || normalizedRow.last_name || normalizedRow['last name'] || "";
          const fullName = normalizedRow.name || normalizedRow['full name'] || normalizedRow.fullname || "";
          
          const name = (fullName || (fName || lName ? `${fName} ${lName}` : "")).trim() || "Unknown";
          
          const company = normalizedRow.company || normalizedRow.organization || normalizedRow.employer || normalizedRow.business || normalizedRow['company name'] || normalizedRow.firm || "";
          const status = normalizedRow.status || normalizedRow.stage || "New";
          const jobTitle = normalizedRow.title || normalizedRow.jobtitle || normalizedRow.position || normalizedRow.designation || "";

          // Validation: Need at least a name (that isn't Unknown) or an email
          if ((name && name !== "Unknown") || email) {
            const metadata: Record<string, any> = { ...row };
            if (jobTitle && !metadata.job_title) metadata.job_title = jobTitle;
            
            const leadToImport = {
               name,
               email,
               company,
               status,
               metadata: JSON.stringify(metadata)
            };

            const duplicate = leads?.find(l => 
               (email && l.email && l.email.toLowerCase() === email.toLowerCase()) || 
               (name && name !== "Unknown" && l.name && l.name.toLowerCase() === name.toLowerCase())
            );

            if (duplicate) {
               duplicateBatch.push({ existing: duplicate, updated: leadToImport, row: metadata });
            } else {
               batch.push(leadToImport);
            }
          }
          setImportProgress(prev => ({ ...prev, current: i + 1 }));
        }
        
        setIsImporting(false);

        if (duplicateBatch.length > 0) {
           setDuplicateResolution({ batch, duplicates: duplicateBatch });
        } else if (batch.length > 0) {
           await doImport(batch, []);
        } else {
           alert("No valid records found in CSV. Ensure columns for 'Name' or 'Email' exist.");
        }
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  if (isLoading) return <div className="p-12 text-blue-400 animate-pulse text-center font-mono">SYNCHRONIZING WITH VAULT...</div>;
  if (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <div className="text-red-500 font-bold mb-4 text-xl">Connection to Vault lost.</div>
        <div className="text-white/60 text-sm mb-6 leading-relaxed bg-red-500/10 p-4 border border-red-500/20 rounded-lg">
           {`ERROR: ${errorMsg}`}
        </div>
        <div className="text-blue-400 font-mono text-[11px] uppercase tracking-tighter cursor-pointer hover:underline" onClick={() => window.location.reload()}>
          Try Nuclear Reload
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* CSV Progress Overlay */}
      {isImporting && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-white">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <h2 className="text-xl font-bold mb-2">Ingesting Intelligence...</h2>
          <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-blue-500 transition-all duration-300" 
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-sm text-white/40">{importProgress.current} / {importProgress.total} records processed</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-6 px-8 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-2.5 text-sm focus:outline-none focus:border-blue-500/40 w-80 shadow-lg"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${showFilters || activeFilterCount > 0 ? 'bg-blue-600/15 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-medium border border-white/10 transition-all"
          >
            <FileUp className="w-4 h-4" /> Import CSV
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="flex items-center gap-3 px-8 py-4 border-b border-white/5 bg-white/[0.02] animate-in">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 outline-none focus:border-blue-500/40 cursor-pointer min-w-[120px]">
              <option value="all" className="bg-[#121212]">All Statuses</option>
              {uniqueStatuses.map(s => <option key={s} value={s} className="bg-[#121212]">{s}</option>)}
            </select>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Company</label>
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 outline-none focus:border-blue-500/40 cursor-pointer min-w-[140px] max-w-[220px]">
              <option value="all" className="bg-[#121212]">All Companies</option>
              {uniqueCompanies.map(c => <option key={c} value={c} className="bg-[#121212]">{c}</option>)}
            </select>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-white/30" />
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 outline-none focus:border-blue-500/40 cursor-pointer min-w-[120px]">
              <option value="all" className="bg-[#121212]">All Time</option>
              <option value="7d" className="bg-[#121212]">Last 7 Days</option>
              <option value="30d" className="bg-[#121212]">Last 30 Days</option>
              <option value="90d" className="bg-[#121212]">Last 90 Days</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <>
              <div className="w-px h-6 bg-white/10" />
              <button onClick={() => { setStatusFilter('all'); setCompanyFilter('all'); setDateFilter('all'); }} className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest font-bold transition-colors">
                Clear All
              </button>
            </>
          )}
          <div className="ml-auto text-[10px] text-white/20 font-mono">{filteredLeads.length} result{filteredLeads.length !== 1 ? 's' : ''}</div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 px-8 py-3 border-b border-blue-500/20 bg-blue-500/[0.07] backdrop-blur-sm">
          <span className="text-xs font-bold text-blue-400">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-blue-500/20" />
          <div className="relative">
            <button
              onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)}
              disabled={isBulkActing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-semibold transition-all border border-blue-500/20"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Move Stage <ChevronDown className="w-3 h-3" />
            </button>
            {showBulkStatusMenu && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-[#121212] border border-white/10 rounded-xl shadow-2xl z-50 p-1 animate-in">
                {['New', 'Contacted', 'Qualified', 'Lost'].map(s => (
                  <button key={s} onClick={() => handleBulkStatusChange(s)} className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-blue-600/20 hover:text-blue-400 text-white/60 transition-colors">{s}</button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={isBulkActing}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold transition-all border border-red-500/20"
          >
            {isBulkActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-[10px] text-white/30 hover:text-white/60 uppercase tracking-widest font-bold transition-colors">
            Deselect All
          </button>
        </div>
      )}

      {/* Grid */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="pl-8 pr-2 py-4 w-10">
                <button onClick={toggleSelectAll} className="text-white/30 hover:text-blue-400 transition-colors">
                  {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : someVisibleSelected ? <MinusSquare className="w-4 h-4 text-blue-400/50" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="px-4 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Name</th>
              <th className="px-4 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Company</th>
              <th className="px-4 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Status</th>
              <th className="px-4 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Email</th>
              <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
            )}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const lead = filteredLeads[virtualRow.index];
              const isSelected = selectedIds.has(lead.id);
              return (
                <tr 
                  key={lead.id} 
                  className={`group cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/[0.06]' : 'hover:bg-white/[0.02]'}`}
                  onClick={() => onSelectRecord(lead.id)}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                >
                  <td className="pl-8 pr-2 py-5 w-10" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleSelect(lead.id)} className="text-white/20 hover:text-blue-400 transition-colors">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 text-xs font-bold text-blue-400 flex-shrink-0">
                        {lead.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{lead.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="text-sm text-white/70 font-medium truncate max-w-[200px]">
                      {getLeadCompany(lead) || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase ${
                      lead.status === 'Qualified' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      lead.status === 'Contacted' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      lead.status === 'Lost' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-white/5 text-white/40 border border-white/10'
                    }`}>
                      {lead.status || "New"}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-sm text-white/40 lowercase truncate max-w-[200px]">{lead.email}</td>
                  <td className="px-8 py-5 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); enrichLead(lead); }}
                        disabled={isEnriching === lead.id}
                        className="p-2 hover:bg-blue-500/20 rounded-lg text-white/20 hover:text-blue-400 transition-all"
                      >
                        {isEnriching === lead.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                      </button>
                  </td>
                </tr>
              );
            })}
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }} />
            )}
          </tbody>
        </table>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-studio-noir border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold">Infect Vault with Core Intel</h2>
              <button onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-4">
              <input 
                placeholder="Full Name" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500 outline-none"
                value={newLead.name}
                onChange={e => setNewLead({...newLead, name: e.target.value})}
              />
              <input 
                placeholder="Email Address" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500 outline-none text-sm"
                value={newLead.email}
                onChange={e => setNewLead({...newLead, email: e.target.value})}
              />
              <input 
                placeholder="Company / Notes" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500 outline-none text-sm"
                value={newLead.company}
                onChange={e => setNewLead({...newLead, company: e.target.value})}
              />
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500 outline-none text-sm text-white/50"
                value={newLead.status}
                onChange={e => setNewLead({...newLead, status: e.target.value as any})}
              >
                <option value="New">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Lost">Lost</option>
              </select>
              <button 
                onClick={() => addLeadMutation.mutate(newLead)}
                disabled={addLeadMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                {addLeadMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>}
                Authorize & Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Duplicate Resolution Modal */}
      {duplicateResolution && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-studio-noir border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-8">
            <h2 className="text-xl font-bold mb-4">Duplicate Records Found</h2>
            <p className="text-sm text-white/60 mb-6">
              We found {duplicateResolution.duplicates.length} records that match existing names or emails in your Vault.
              Do you want to merge these records and populate any missing fields?
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => doImport(duplicateResolution.batch, duplicateResolution.duplicates)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all"
              >
                Merge & Update Missing Fields
              </button>
              <button 
                onClick={() => setDuplicateResolution(null)}
                className="w-full text-white/40 hover:text-white font-bold py-3 text-sm transition-all"
              >
                Cancel Import Completely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
