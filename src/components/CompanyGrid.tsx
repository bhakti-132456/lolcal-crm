import { useQuery } from "@tanstack/react-query";
import { getLeads } from "../lib/db";
import { 
  Building2,
  Search,
  Globe, 
  Users,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

export function CompanyGrid({ onSelectRecord }: { onSelectRecord: (id: string) => void }) {
  const [search, setSearch] = useState("");

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      return await getLeads();
    }
  });

  if (isLoading) return <div className="p-12 text-blue-400 animate-pulse text-center font-mono">RETRIEVING CORPORATE RECORDS...</div>;

  // Extract distinct companies from leads (with metadata fallback)
  const companyMap = new Map();
  leads?.forEach(lead => {
     let companyName = lead.company?.trim() || "";
     
     // Fallback: try to extract company from metadata if field is empty
     if (!companyName && lead.metadata) {
       try {
         const md = JSON.parse(lead.metadata);
         companyName = md.company || md.Company || md['Company Name'] || md.company_name 
           || md.Organization || md.organization || md['Organization Name'] || md.organisation
           || md.Employer || md.employer || md.Business || md.business || "";
       } catch (e) {}
     }
     
     // Final fallback
     if (!companyName) companyName = "Unassigned";
     
     if (!companyMap.has(companyName)) {
         companyMap.set(companyName, { name: companyName, leads: [] });
     }
     companyMap.get(companyName).leads.push(lead);
  });

  // Sort: put "Unassigned" at the end, then alphabetical
  const companies = Array.from(companyMap.values()).sort((a, b) => {
    if (a.name === 'Unassigned') return 1;
    if (b.name === 'Unassigned') return -1;
    return a.name.localeCompare(b.name);
  });

  const filtered = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-black/20">
      {/* Header */}
      <div className="flex items-center justify-between p-8 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input 
            type="text" 
            placeholder="Filter organizations..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-2.5 text-sm focus:outline-none focus:border-blue-500/40 w-96 shadow-lg"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered?.map((company, index) => (
            <div 
              key={index}
              onClick={() => {}}
              className="bg-studio-noir border border-white/5 hover:border-blue-500/30 rounded-2xl p-6 transition-all group cursor-pointer hover:shadow-2xl hover:shadow-blue-500/5 shadow-xl"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${company.name === 'Unassigned' ? 'from-white/5 to-white/5' : 'from-blue-500/10 to-purple-500/10'} flex items-center justify-center border border-white/10 text-blue-400 shadow-inner`}>
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{company.name}</h3>
              <div className="flex items-center gap-2 text-xs text-white/30 mb-6 font-mono">
                <Globe className="w-3.5 h-3.5" />
                <span>
                  {(() => {
                    // Show unique statuses as a summary
                    const statuses = company.leads.reduce((acc: Record<string, number>, l: any) => {
                      const s = l.status || 'New';
                      acc[s] = (acc[s] || 0) + 1;
                      return acc;
                    }, {});
                    return Object.entries(statuses).map(([s, c]) => `${c} ${s}`).join(' · ');
                  })()}
                </span>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>{company.leads.length} {company.leads.length === 1 ? 'Lead' : 'Leads'}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-blue-400 transition-all translate-x-0 group-hover:translate-x-1" />
              </div>
            </div>
          ))}
          
          {filtered?.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <Building2 className="w-12 h-12 text-white/5 mx-auto mb-4" />
              <p className="text-white/20 font-mono uppercase tracking-[0.2em] text-xs">No corporate entities found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
