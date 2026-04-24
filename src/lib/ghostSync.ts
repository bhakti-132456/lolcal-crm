import { invoke } from "@tauri-apps/api/core";

export async function ghostSyncPrompt(
  prompt: string, 
  model: string = 'sarvam', 
  context: string = "", 
  history: {role: string, text: string}[] = []
) {
  try {
    const systemPrompt = "You are AXON. An AI CRM assistant. Be concise, realistic, and use the provided data only. No fluff.";
    
    // 1. SYSTEM GATE
    let fullPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|>`;

    // 2. CONTEXT & HISTORY
    for (const msg of history) {
      const role = msg.role === 'user' ? 'user' : 'assistant';
      fullPrompt += `<|start_header_id|>${role}<|end_header_id|>\n\n${msg.text}<|eot_id|>`;
    }

    // 3. CURRENT USER QUERY + FORCED REASONING
    fullPrompt += `<|start_header_id|>user<|end_header_id|>\n\n`;
    if (context) {
      fullPrompt += `[CONTEXT DATA]\n${context}\n\n`;
    }
    
    fullPrompt += `${prompt}\n\nAnalyze the context and answer my question. Think step-by-step inside <thought> tags before answering.<|eot_id|>`;
    
    // 4. ASSISTANT PRE-FILL (The "Lock")
    fullPrompt += `<|start_header_id|>assistant<|end_header_id|>\n\n<thought>\n`;

    // Talk to sidecar through Rust proxy to bypass CORS
    const result = await invoke<string>("proxy_brain", { prompt: fullPrompt });
    
    // Since we pre-filled <thought>, we need to put it back in the result for the UI parser
    return `<thought>\n${result}`;
  } catch (e) {
    console.warn("Internal Brain proxy failed, falling back to System Ollama...", e);
    return fallbackToOllama(prompt, model, context);
  }
}

async function fallbackToOllama(prompt: string, model: string, context: string = "") {
  try {
    const fullPrompt = context 
      ? `### CONTEXT (Current CRM Data):\n${context}\n\n### USER REQUEST:\n${prompt}`
      : prompt;

    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model === 'sarvam' ? 'llama3' : model,
          prompt: fullPrompt,
          stream: false
        })
    });
    
    if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    return data.response || "Warning: Ollama returned an empty message.";
  } catch (err: any) {
    throw new Error(`AI Core Fallback Error: ${err.message}. Please restart AXON or ensure Ollama is active.`);
  }
}

export async function switchAxonBrain(modelName: string) {
   return await invoke("switch_brain", { modelName });
}

