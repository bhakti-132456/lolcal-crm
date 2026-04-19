import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeads, updateLead } from "../lib/db";
import { 
  X, 
  User, 
  Mail, 
  Briefcase,
  Sparkles,
  Loader2,
  Check
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
       return await updateLead(record.id, { company: updatedData.company, status: updatedData.status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsSaving(false);
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
                   disabled
                   value={formData.name || ''} 
                   className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all opacity-50 cursor-not-allowed"
                 />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-white/40 pl-1 uppercase font-semibold">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  disabled
                  value={formData.email || ''} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all opacity-50 cursor-not-allowed"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 pl-1 uppercase font-semibold">Status</label>
              <div className="relative">
                 <select 
                   value={formData.status || 'New'} 
                   onChange={e => handleFieldChange('status', e.target.value)}
                   className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-blue-500 outline-none transition-all"
                 >
                   <option value="New">New Lead</option>
                   <option value="Contacted">Contacted</option>
                   <option value="Qualified">Qualified</option>
                   <option value="Lost">Lost</option>
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

          <section className="pt-6 border-t border-white/5">
             <div className="bg-blue-500/5 rounded-2xl p-6 border border-blue-500/10 text-center">
                <Sparkles className={`w-8 h-8 text-blue-400 mx-auto mb-3 opacity-50`} />
                <h4 className="text-xs font-bold mb-1">Enrichment Action Disabled</h4>
                <p className="text-[10px] text-white/40 mb-4 px-4 leading-relaxed">Please use the list view Grid to trigger AI enrichment per record to aggregate external web sources.</p>
             </div>
          </section>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-6 border-t border-white/5 flex gap-3 bg-black/40 backdrop-blur-3xl">
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
