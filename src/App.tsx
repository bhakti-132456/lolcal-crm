import { LeadGrid } from "./components/LeadGrid";
import { CompanyGrid } from "./components/CompanyGrid";
import { Overview } from "./components/Overview";
import { Logo } from "./components/Logo";
import { StatusIndicator } from "./components/StatusIndicator";
import { RecordPanel } from "./components/RecordPanel";
import { useState } from "react";
import { ghostSyncPrompt } from "./lib/ghostSync";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Settings, 
  Zap,
  Globe,
  Database,
  Brain,
  MessageSquare,
  Send,
  X,
  ChevronDown
} from "lucide-react";

type View = "overview" | "leads" | "companies" | "automations" | "ghost-sync" | "vault";

function App() {
  console.log("AXON_CORE: App Component Initializing...");
  const [activeView, setActiveView] = useState<View>("leads");
  const [selectedModel, setSelectedModel] = useState("llama3");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // State for Record Panel (Twenty.hq style)
  const [selectedRecord, setSelectedRecord] = useState<{type: 'person' | 'company', id: string} | null>(null);

  const sendMessage = async () => {
    if (!currentInput.trim()) return;
    
    const userMsg = currentInput;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setCurrentInput("");
    setIsTyping(true);

    try {
      // 1. FETCH CONTEXT (Pull latest info for the Brain)
      let leadContext = "";
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const leads = await invoke<any[]>("get_leads");
        leadContext = leads.slice(0, 50).map(l => `- ${l.name} (${l.company}): ${l.status}`).join("\n");
      } catch (ce) {
         console.warn("Could not fetch lead context for brain", ce);
      }

      // 2. TALK TO BRAIN
      const response = await ghostSyncPrompt(userMsg, selectedModel, leadContext, chatHistory);
      
      // 3. ANIMATED TYPEWRITER EFFECT
      const fullText = response || "Brain returned an empty response. Try a different prompt.";
      let displayedText = "";
      
      // Add placeholder message for the assistant
      setChatHistory(prev => [...prev, { role: 'assistant', text: "" }]);
      
      const words = fullText.split(' ');
      for (let i = 0; i < words.length; i++) {
        displayedText += (i === 0 ? '' : ' ') + words[i];
        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', text: displayedText };
          return updated;
        });
        // Control typing speed (faster for longer messages)
        await new Promise(r => setTimeout(r, Math.max(5, 50 - words.length))); 
      }

    } catch (e: any) {
      console.error("AXON_CHAT_ERROR:", e);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        text: `⚠️ [ERROR] Brain Access Fault: ${e?.message || e || "Unknown connection failure."}` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return <Overview />;
      case "leads":
        return <LeadGrid onSelectRecord={(id) => setSelectedRecord({type: 'person', id})} />;
      case "companies":
        return <CompanyGrid onSelectRecord={(id) => setSelectedRecord({type: 'company', id})} />;
      case "vault":
        return (
          <div className="flex-1 flex items-center justify-center bg-black/40">
            <div className="text-center">
              <Database className="w-16 h-16 text-blue-500/20 mx-auto mb-6" />
              <h2 className="text-xl font-bold mb-2">Vault Administration</h2>
              <p className="text-sm text-white/40 mb-8 max-w-sm mx-auto">Operating on Sovereign Direct SQLite connection. No PocketBase sidecar active. Database is stored securely in your project root.</p>
              <button disabled className="bg-blue-600/50 text-white/50 px-8 py-3 rounded-xl font-bold text-sm shadow-xl shadow-blue-500/10 cursor-not-allowed">SQLite Studio (Coming Soon)</button>
            </div>
          </div>
        );
      default:
        return <Overview />;
    }
  };

  return (
    <div className="flex w-full h-screen bg-studio-noir text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col bg-black/40 backdrop-blur-3xl z-20">
        <div className="p-8">
          <Logo />
        </div>
        
        <nav className="flex-1 px-6 space-y-1">
          <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.25em] px-2 mb-4">Workspace</div>
          <NavItem icon={<LayoutDashboard className="w-4 h-4"/>} label="Overview" active={activeView === "overview"} onClick={() => setActiveView("overview")} />
          <NavItem icon={<Users className="w-4 h-4"/>} label="Leads" active={activeView === "leads"} onClick={() => setActiveView("leads")} />
          <NavItem icon={<Building2 className="w-4 h-4"/>} label="Companies" active={activeView === "companies"} onClick={() => setActiveView("companies")} />
          
          <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.25em] px-2 mt-10 mb-4">Sovereign</div>
          <NavItem icon={<Zap className="w-4 h-4"/>} label="Automations" active={activeView === "automations"} onClick={() => setActiveView("automations")} />
          <NavItem icon={<Globe className="w-4 h-4"/>} label="Ghost-Sync" active={activeView === "ghost-sync"} onClick={() => setActiveView("ghost-sync")} />
          <NavItem icon={<Database className="w-4 h-4" />} label="Vault" active={activeView === "vault"} onClick={() => setActiveView("vault")} />
        </nav>

        <div className="p-8 border-t border-white/5 space-y-4">
          <NavItem icon={<Settings className="w-4 h-4"/>} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-black/20">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-black/20 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/40">Workspace</span>
            <span className="text-white/20">/</span>
            <span className="text-white font-medium capitalize">{activeView}</span>
          </div>
          
          <div className="flex items-center gap-6">
             {/* Brain Selector */}
             <div className="relative group">
                <button className="flex items-center gap-2.5 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/10 transition-all">
                  <Brain className="w-4 h-4 text-blue-400" />
                  <span>{selectedModel}</span>
                  <ChevronDown className="w-3 h-3 text-white/40" />
                </button>
                <div className="absolute top-full right-0 mt-2 w-48 bg-studio-noir border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-1">
                   {['llama3', 'sarvam', 'mistral'].map(m => (
                     <button 
                        key={m}
                        onClick={async () => {
                          setSelectedModel(m);
                          try {
                            await (await import("./lib/ghostSync")).switchAxonBrain(m);
                          } catch (e) {
                            console.error("Failed to switch internal brain", e);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-blue-600/20 hover:text-blue-400 transition-colors ${selectedModel === m ? 'text-blue-400 bg-blue-600/10' : 'text-white/60'}`}
                      >
                       {m === 'sarvam' ? 'Sarvam 1 2B' : m.charAt(0).toUpperCase() + m.slice(1)}
                     </button>
                   ))}
                </div>
             </div>

            <StatusIndicator />
            
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-2.5 rounded-full transition-all border ${isChatOpen ? 'bg-blue-600 border-blue-500 text-white' : 'text-white/30 border-transparent hover:border-white/10 hover:bg-white/5'}`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* View Area */}
        <div className="flex-1 overflow-hidden relative">
          {renderView()}
        </div>

        {/* Record Panel (Slide-out) */}
        {selectedRecord && (
            <>
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" 
                    onClick={() => setSelectedRecord(null)}
                />
                <RecordPanel 
                    record={selectedRecord} 
                    onClose={() => setSelectedRecord(null)} 
                />
            </>
        )}

        {/* Chat Bot Drawer */}
        <div className={`
          absolute top-20 right-0 bottom-0 w-96 bg-studio-noir border-l border-white/5 z-30 transition-transform duration-500
          ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
           <div className="flex flex-col h-full">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">AXON Intelligence</h3>
                      <p className="text-[10px] text-blue-400 uppercase tracking-widest">{selectedModel} active</p>
                    </div>
                 </div>
                 <button onClick={() => setIsChatOpen(false)} className="text-white/20 hover:text-white"><X className="w-5 h-5"/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {chatHistory.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                        <Zap className="w-8 h-8 text-blue-400 opacity-50" />
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed italic">
                        "I am your Sovereign CRM intelligence. Ask me to summarize leads, predict revenue, or optimize your pipeline."
                      </p>
                   </div>
                 )}
                  {chatHistory.map((m, i) => {
                    const hasThought = m.text.includes('<thought>') && m.text.includes('</thought>');
                    let thought = "";
                    let finalAnswer = m.text;
                    
                    if (hasThought) {
                      const match = m.text.match(/<thought>([\s\S]*?)<\/thought>/);
                      if (match) {
                        thought = match[1];
                        finalAnswer = m.text.replace(/<thought>[\s\S]*?<\/thought>/, "").trim();
                      }
                    }

                    return (
                      <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                         {m.role === 'assistant' && hasThought && (
                           <details className="mb-2 w-full max-w-[85%] group">
                             <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/60 transition-colors list-none flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg w-fit">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                               AXON Reasoning...
                             </summary>
                             <div className="mt-2 p-3 bg-white/[0.02] border-l border-blue-500/30 text-[10px] text-white/40 leading-relaxed font-mono rounded-r-lg">
                               {thought}
                             </div>
                           </details>
                         )}
                         <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-white/80'}`}>
                           {finalAnswer || (m.role === 'assistant' ? "Thinking..." : "")}
                         </div>
                      </div>
                    );
                  })}
                 {isTyping && (
                   <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl flex gap-1 items-center">
                        <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></span>
                      </div>
                   </div>
                 )}
              </div>

              <div className="p-6 border-t border-white/5 bg-black/20">
                 <div className="relative">
                    <input 
                      placeholder="Prompt the Brain..."
                      value={currentInput}
                      onChange={e => setCurrentInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-xs outline-none focus:border-blue-500/50 transition-all font-mono"
                    />
                    <button 
                      onClick={sendMessage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`
      w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300
      ${active 
        ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg" 
        : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"}
    `}>
      {icon}
      {label}
    </button>
  );
}

export default App;
