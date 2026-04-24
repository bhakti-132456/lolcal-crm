import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getLeads, addLead, importCsvBatch, updateLead, Lead } from "../lib/db";
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
  Signal,
  SignalLow
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

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

  const filteredLeads = leads?.filter(l => 
    `${l.name}`.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
      const prompt = `Lead: ${lead.name}, email ${lead.email}. Provide a professional multilingual summary and sector. Return ONLY JSON: {"sector": "...", "summary": "..."}`;
      const aiResult = await ghostSyncPrompt(prompt);
      
      let data;
      try {
          data = typeof aiResult === "string" ? JSON.parse(aiResult) : aiResult;
      } catch (e) {
          const match = aiResult.match(/\{.*\}/s);
          if (match) data = JSON.parse(match[0]);
          else data = { sector: "Unknown", summary: "Summary generated." };
      }

      const updatedCompany = `${data.sector || "General"} | ${data.summary}`.slice(0, 100);

      await updateLead(lead.id, { company: updatedCompany });
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
          let oldMetadata = {};
          try { oldMetadata = JSON.parse(existing.metadata || '{}'); } catch (e) {}
          const newMetadata = JSON.stringify({ ...oldMetadata, ...row });
          
          await updateLead(existing.id, {
             name: existing.name !== "Unknown" && existing.name ? existing.name : updated.name,
             email: existing.email || updated.email,
             company: existing.company || updated.company,
             metadata: newMetadata
          });
       }
       
       alert(`Import Complete. ${finalBatch.length} added, ${duplicateUpdates.length} updated.`);
       queryClient.invalidateQueries({ queryKey: ["leads"] });
     } catch (e) {
       alert("CSV Import failed: " + e);
     }
     setIsImporting(false);
     setDuplicateResolution(null);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        setImportProgress({ current: 0, total: rows.length });
        
        let batch = [];
        let duplicateBatch = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const fName = row.firstName || row.Firstname || row.first_name || row.Name?.split(' ')[0] || "";
          const lName = row.lastName || row.Lastname || row.last_name || row.Name?.split(' ')[1] || "";
          const email = row.email || row.Email || row['E-mail'] || "";
          const company = row.company || row.Company || row.jobTitle || row.Title || "";

          if ((fName || row.Name) && email) {
            const name = (row.Name ? row.Name : `${fName} ${lName}`).trim() || "Unknown";
            const newLead = {
               name: name,
               email: email,
               company: company,
               status: "New",
               metadata: JSON.stringify(row)
            };

            const duplicate = leads?.find(l => 
               (l.email && l.email.toLowerCase() === email.toLowerCase()) || 
               (l.name && l.name.toLowerCase() === name.toLowerCase())
            );

            if (duplicate) {
               duplicateBatch.push({ existing: duplicate, updated: newLead, row });
            } else {
               batch.push(newLead);
            }
          }
          setImportProgress(prev => ({ ...prev, current: i + 1 }));
        }
        
        setIsImporting(false);

        if (duplicateBatch.length > 0) {
           setDuplicateResolution({ batch, duplicates: duplicateBatch });
        } else {
           await doImport(batch, []);
        }
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
      <div className="flex items-center justify-between p-8 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input 
            type="text" 
            placeholder="Search leads..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-2.5 text-sm focus:outline-none focus:border-blue-500/40 w-96 shadow-lg"
          />
        </div>
        
        <div className="flex items-center gap-4">
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

      {/* Grid */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Name</th>
              <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Company / Summary</th>
              <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Status</th>
              <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Email</th>
              <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
            )}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const lead = filteredLeads[virtualRow.index];
              return (
                <tr 
                  key={lead.id} 
                  className="hover:bg-white/[0.02] group cursor-pointer transition-colors"
                  onClick={() => onSelectRecord(lead.id)}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 text-sm font-bold text-blue-400">
                        {lead.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{lead.name}</div>
                        <div className="text-[10px] text-white/30 mt-1 uppercase tracking-tighter italic">{lead.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm text-white font-medium">{lead.company || "General"}</div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      lead.status === 'Qualified' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      lead.status === 'Contacted' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      'bg-white/5 text-white/40 border border-white/10'
                    }`}>
                      {lead.status || "New"}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm text-white/50 lowercase">{lead.email}</td>
                  <td className="px-8 py-6 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); enrichLead(lead); }}
                        disabled={isEnriching === lead.id}
                        className="p-2.5 hover:bg-blue-500/20 rounded-xl text-white/20 hover:text-blue-400 transition-all"
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
