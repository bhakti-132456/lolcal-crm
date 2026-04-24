import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Shield, Sparkles } from "lucide-react";

export function StatusIndicator() {
  const [vaultStatus, setVaultStatus] = useState("Checking...");
  const [aiStatus, setAiStatus] = useState("Checking...");

  useEffect(() => {
    const checkVault = async () => {
      try {
        const s = await invoke<string>("get_vault_status");
        setVaultStatus(s);
      } catch (e) {
        setVaultStatus("Local");
      }
    };
    checkVault();
    
    const checkAI = async () => {
      try {
        const status = await invoke<string>("get_brain_status");
        setAiStatus(status);
      } catch (e) {
        setAiStatus("Offline");
      }
    };
    
    checkAI();
    const interval = setInterval(checkAI, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-4 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium tracking-widest uppercase">
      <div className="flex items-center gap-1.5 border-r border-white/10 pr-4">
        <Shield className={`w-3 h-3 ${vaultStatus === "Sovereign" ? "text-blue-400" : "text-gray-400"}`} />
        <span className="text-white/60">Vault: </span>
        <span className={vaultStatus === "Sovereign" ? "text-blue-400" : "text-white"}>{vaultStatus}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Sparkles className={`w-3 h-3 ${aiStatus === "Active" ? "text-purple-400" : (aiStatus === "Ollama Ready" ? "text-amber-400" : "text-gray-400")}`} />
        <span className="text-white/60">AI: </span>
        <span className={aiStatus === "Active" ? "text-purple-400" : (aiStatus === "Ollama Ready" ? "text-amber-400" : "text-white/40")}>
          {aiStatus}
        </span>
      </div>
    </div>
  );
}
