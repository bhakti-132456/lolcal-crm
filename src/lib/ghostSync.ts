import { invoke } from "@tauri-apps/api/core";

export async function ghostSyncPrompt(prompt: string, model: string = 'sarvam') {
  // Trigger internal AXON brain switch if necessary
  // (In a real app, we'd only switch if the core is different)
  
  try {
    const response = await fetch('http://localhost:11435/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `\n\n### Instruction:\n${prompt}\n\n### Response:\n`,
        n_predict: 256,
        temperature: 0.7,
        stop: ["###", "\n\n"]
      })
    });
    
    if (!response.ok) {
       // Fallback to Ollama if internal server is down
       return fallbackToOllama(prompt, model);
    }
    
    const data = await response.json();
    return data.content;
  } catch (e) {
    console.warn("Internal Brain offline, falling back to System Ollama...");
    return fallbackToOllama(prompt, model);
  }
}

async function fallbackToOllama(prompt: string, model: string) {
  const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model === 'sarvam' ? 'sarvam' : 'llama3',
        prompt: prompt,
        stream: false
      })
  });
  const data = await response.json();
  return data.response;
}

export async function switchAxonBrain(modelName: string) {
   return await invoke("switch_brain", { modelName });
}

