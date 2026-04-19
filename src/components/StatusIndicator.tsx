import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Shield, Sparkles } from "lucide-react";

export function StatusIndicator() {
  const [vaultStatus, setVaultStatus] = useState("Checking...");
  const [aiMode, setAiMode] = useState<"Local" | "Cloud">("Local");

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
    
    // Check internet for AI Mode
    const checkAI = () => {
      setAiMode(navigator.onLine ? "Cloud" : "Local");
    };
    checkAI();
    window.addEventListener("online", checkAI);
    window.addEventListener("offline", checkAI);
    return () => {
      window.removeEventListener("online", checkAI);
      window.removeEventListener("offline", checkAI);
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
        <Sparkles className={`w-3 h-3 ${aiMode === "Local" ? "text-purple-400" : "text-amber-400"}`} />
        <span className="text-white/60">AI: </span>
        <span className={aiMode === "Local" ? "text-purple-400" : "text-amber-400"}>{aiMode}</span>
      </div>
    </div>
  );
}
