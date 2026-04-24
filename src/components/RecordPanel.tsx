import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeads, updateLead, deleteLead } from "../lib/db";
import { ghostSyncPrompt } from "../lib/ghostSync";
import { 
  X, 
  User, 
  Mail, 
  Briefcase,
  Sparkles,
  Loader2,
  Check,
  Trash2,
  Bot
} from "lucide-react";
import { useState, useEffect } from "react";

interface RecordPanelProps {
  record: { type: 'person' | 'company', id: string } | null;
  onClose: () => void;
}

export function RecordPanel({ record, onClose }: RecordPanelProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiNotes, setAiNotes] = useState("");

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      return await getLeads();
    }
  });

  const leadData = leads?.find(l => l.id === record?.id);

  useEffect(() => {
    if (leadData) {
      setFormData(leadData);
    }
  }, [leadData]);

  const saveMutation = useMutation({
    mutationFn: async (updatedData: any) => {
       if (!record?.id) return;
       return await updateLead(record.id, { 
         name: updatedData.name,
         email: updatedData.email,
         company: updatedData.company, 
         status: updatedData.status 
       });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsSaving(false);
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
       if (!record?.id) return;
       return await deleteLead(record.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsDeleting(false);
      onClose();
    }
  });

  if (!record) return null;

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    saveMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this lead?")) {
      setIsDeleting(true);
      deleteMutation.mutate();
    }
  };

  const handleGenerateNotes = async () => {
    setIsGenerating(true);
    setAiNotes("");
    try {
      const prompt = `As an expert sales assistant, generate a conversation transcript and key bullet points for a sales rep to reference during a call with ${formData.name || 'this lead'}, who works at ${formData.company || 'an unknown company'}. The lead is in the '${formData.status || 'New'}' stage. Please format with bullet points for easy reading.`;
      const response = await ghostSyncPrompt(prompt, 'sarvam');
      setAiNotes(response || "No response. Ensure AI Brain is active.");
    } catch (e: any) {
      setAiNotes("Error parsing from brain: " + (e.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-[500px] bg-studio-noir border-l border-white/10 shadow-2xl z-[60] transition-transform duration-500 ease-in-out ${record ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
             <User className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {formData.name || 'Unknown'}
            </h2>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">{record.type} record • {record.id}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <X className="w-5 h-5 text-white/40" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-10">
          {/* Main Info Section */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Identity & Contact</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 pl-1 uppercase font-semibold">Full Name</label>
              <div className="relative">
                 <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                 <input 
                   value={formData.name || ''} 
                   onChange={e => handleFieldChange('name', e.target.value)}
                   className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all focus:border-blue-500"
                 />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-white/40 pl-1 uppercase font-semibold">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  value={formData.email || ''} 
                  onChange={e => handleFieldChange('email', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 pl-1 uppercase font-semibold">Status</label>
              <div className="relative">
                  <select 
                    value={formData.status || 'New'} 
                    onChange={e => handleFieldChange('status', e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-blue-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="New" className="bg-[#121212] text-white">New Lead</option>
                    <option value="Contacted" className="bg-[#121212] text-white">Contacted</option>
                    <option value="Qualified" className="bg-[#121212] text-white">Qualified</option>
                    <option value="Lost" className="bg-[#121212] text-white">Lost</option>
                  </select>
              </div>
            </div>

          </section>

          <section className="space-y-6">
            <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Context</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 pl-1 uppercase font-semibold">Company / Summary</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-3 w-4 h-4 text-white/20" />
                <textarea 
                  value={formData.company || ''} 
                  onChange={e => handleFieldChange('company', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:border-blue-500 outline-none transition-all min-h-[100px] resize-none"
                />
              </div>
            </div>
          </section>

          {formData.metadata && (
            <section className="space-y-6">
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Additional Intelligence</h3>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                {(() => {
                  try {
                    const md = JSON.parse(formData.metadata);
                    return Object.entries(md).map(([key, value]) => {
                      if (!value || typeof value !== 'string') return null;
                      if (['Name', 'Email', 'Company', 'Status', 'firstName', 'lastName', 'first_name', 'last_name', 'jobTitle', 'Title', 'E-mail'].includes(key)) return null;
                      return (
                        <div key={key}>
                          <label className="text-[10px] text-white/40 pl-1 uppercase font-semibold">{key}</label>
                          <div className="text-sm text-white/80 mt-1 pl-1 font-medium break-words">{value}</div>
                        </div>
                      );
                    });
                  } catch (e) {
                     return null;
                  }
                })()}
              </div>
            </section>
          )}

          <section className="pt-6 border-t border-white/5">
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <Bot className="w-4 h-4" /> AI Sales Assistant
                    </h3>
                    <button 
                       onClick={handleGenerateNotes} 
                       disabled={isGenerating}
                       className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2"
                    >
                       {isGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                       Generate Transcripts
                    </button>
                 </div>
                 
                 {aiNotes ? (
                    <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-100/80 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                       {aiNotes}
                    </div>
                 ) : (
                    <div className="bg-blue-500/5 rounded-2xl p-6 border border-blue-500/10 text-center">
                      <Sparkles className={`w-8 h-8 text-blue-400 mx-auto mb-3 opacity-50`} />
                      <h4 className="text-xs font-bold mb-1">No generated content</h4>
                      <p className="text-[10px] text-white/40 px-4 leading-relaxed">Generate conversation transcripts and bullet points based on this lead's current stage to help with your next interaction.</p>
                    </div>
                 )}
              </div>
          </section>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-6 border-t border-white/5 flex gap-3 bg-black/40 backdrop-blur-3xl">
        <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-none p-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all border border-red-500/20"
            title="Delete Lead"
        >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
        <button 
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-bold py-3.5 rounded-xl text-xs transition-all border border-white/10"
        >
            Cancel
        </button>
        <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
        </button>
      </div>
    </div>
  );
}
