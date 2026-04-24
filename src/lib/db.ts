import { invoke } from "@tauri-apps/api/core";

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  created_at: string;
  metadata?: string;
}

export async function getLeads(): Promise<Lead[]> {
  return await invoke("get_leads");
}

export async function addLead(name: string, email: string, company: string, status: string): Promise<string> {
  return await invoke("add_lead", { name, email, company, status });
}

export async function importCsvBatch(leads: Omit<Lead, "id" | "created_at">[]): Promise<number> {
  return await invoke("import_csv_batch", { leads });
}

export async function updateLead(id: string, updates: { name?: string; email?: string; company?: string; status?: string; metadata?: string }): Promise<void> {
  return await invoke("update_lead", { id, ...updates });
}

export async function deleteLead(id: string): Promise<void> {
  return await invoke("delete_lead", { id });
}
