import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_STORAGE_KEY, CONFIG_STORAGE_KEY, HISTORY_STORAGE_KEY } from "@/lib/constants";
import { Catalog, ProjectConfig } from "@/types";

const SUPABASE_TABLE = "technician_pricing_dashboard_configs";

type SupabasePayload = {
  id: string;
  project_config: ProjectConfig;
  catalog: Catalog | null;
  updated_at: string;
};

let supabaseClient: SupabaseClient | null = null;

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}

export function loadLocalProjectConfig(): ProjectConfig | null {
  if (!canUseBrowserStorage()) return null;
  const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ProjectConfig) : null;
}

export function saveLocalProjectConfig(config: ProjectConfig) {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function loadLocalCatalog(): Catalog | null {
  if (!canUseBrowserStorage()) return null;
  const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Catalog) : null;
}

export function saveLocalCatalog(catalog: Catalog) {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
}

export function loadLocalHistory(): ProjectConfig[] {
  if (!canUseBrowserStorage()) return [];
  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ProjectConfig[]) : [];
}

export function saveLocalHistory(history: ProjectConfig[]) {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-20)));
}

export async function saveCloudConfig(projectConfig: ProjectConfig, catalog: Catalog | null) {
  const client = getSupabaseClient();
  if (!client) return;
  const payload: SupabasePayload = {
    id: "singleton",
    project_config: projectConfig,
    catalog,
    updated_at: new Date().toISOString()
  };
  await client.from(SUPABASE_TABLE).upsert(payload, { onConflict: "id" });
}

export async function loadCloudConfig() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from(SUPABASE_TABLE).select("*").eq("id", "singleton").maybeSingle();
  if (error || !data) return null;
  return data as SupabasePayload;
}
