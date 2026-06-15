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

function readJson<T>(key: string, fallback: T) {
  if (!canUseBrowserStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage cleanup failures.
    }
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseBrowserStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota or serialization failures so the app keeps working.
  }
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
  return readJson<ProjectConfig | null>(CONFIG_STORAGE_KEY, null);
}

export function saveLocalProjectConfig(config: ProjectConfig) {
  writeJson(CONFIG_STORAGE_KEY, config);
}

export function loadLocalCatalog(): Catalog | null {
  return readJson<Catalog | null>(CATALOG_STORAGE_KEY, null);
}

export function saveLocalCatalog(catalog: Catalog) {
  writeJson(CATALOG_STORAGE_KEY, catalog);
}

export function loadLocalHistory(): ProjectConfig[] {
  return readJson<ProjectConfig[]>(HISTORY_STORAGE_KEY, []);
}

export function saveLocalHistory(history: ProjectConfig[]) {
  writeJson(HISTORY_STORAGE_KEY, history.slice(-20));
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
