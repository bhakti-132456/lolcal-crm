import { useQuery } from "@tanstack/react-query";
import { getLeads } from "../lib/db";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  Target,
  ArrowUpRight,
  Shield,
  Zap,
  Clock
} from "lucide-react";

export function Overview() {
  const { data: leads } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      return await getLeads();
    }
  });

  const distinctCompanies = leads ? new Set(leads.map(l => l.company).filter(Boolean)).size : 0;

  const stats = [
    { label: "Total Leads", value: leads?.length || 0, icon: <Users className="w-5 h-5 text-blue-400" />, trend: "+12.5%", positive: true },
    { label: "Accounts", value: distinctCompanies, icon: <Building2 className="w-5 h-5 text-purple-400" />, trend: "+2.4%", positive: true },
    { label: "Qualified", value: leads?.filter(l => l.status === 'Qualified').length || 0, icon: <Target className="w-5 h-5 text-green-400" />, trend: "+18%", positive: true },
    { label: "Avg. Velocity", value: "4.2 days", icon: <Clock className="w-5 h-5 text-amber-400" />, trend: "-1.1%", positive: false },
  ];

  return (
    <div className="flex-1 overflow-auto p-10 space-y-10 bg-black/20">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Command Center</h1>
          <p className="text-sm text-white/40">Sovereign CRM Intelligence Overview</p>
        </div>
        <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">Export Report</button>
            <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Sync Vault</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-studio-noir border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-4 h-4 text-white/20" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                {stat.icon}
              </div>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-white">{stat.value}</span>
              <span className={`text-[10px] font-bold ${stat.positive ? 'text-green-400' : 'text-red-400'}`}>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-2 bg-studio-noir border border-white/5 rounded-3xl p-8 h-[400px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    Pipeline Evolution
                </h3>
                <div className="flex gap-2">
                    {['1W', '1M', '3M', 'ALL'].map(t => (
                        <button key={t} className={`px-3 py-1 rounded-lg text-[9px] font-bold tracking-widest ${t === '1M' ? 'bg-blue-600 text-white' : 'text-white/20 hover:text-white'}`}>{t}</button>
                    ))}
                </div>
            </div>
            <div className="flex-1 border-b border-l border-white/5 relative">
                {/* Visual Fake Chart Bars */}
                <div className="absolute inset-x-8 bottom-0 top-12 flex items-end justify-around gap-4">
                    {[40, 70, 45, 90, 65, 80, 55, 100, 75, 40].map((h, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-blue-600/40 to-blue-400/10 border-t-2 border-blue-500/40 rounded-t-lg transition-all hover:from-blue-500/60" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>
        </div>

        {/* Side Progress */}
        <div className="bg-studio-noir border border-white/5 rounded-3xl p-8 flex flex-col gap-8">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Intelligence KPIs
            </h3>
            
            <div className="space-y-6">
                <KpiProgress label="Lead Enrichment" value={65} color="bg-blue-500" />
                <KpiProgress label="Vault Health" value={100} color="bg-green-500" />
                <KpiProgress label="SQLite DB Query" value={98} color="bg-purple-500" />
            </div>

            <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-4 h-4 text-white/40" />
                    <span className="text-[10px] font-bold text-white/60 uppercase">Sovereign Status</span>
                </div>
                <p className="text-[10px] text-white/30 leading-relaxed italic">Direct SQLite integration active. Models run locally.</p>
            </div>
        </div>
      </div>
    </div>
  );
}

function KpiProgress({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className="text-white/40">{label}</span>
                <span className="text-white">{value}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}
