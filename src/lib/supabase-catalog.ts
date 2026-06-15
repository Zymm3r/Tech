import { getSupabaseClient } from "@/lib/persistence";
import { Catalog, Technician, Multiplier, PricingPlan } from "@/types";
import { DEFAULT_CATALOG } from "@/lib/default-data";

export async function loadCatalogFromSupabase(): Promise<Catalog | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [techResult, multResult, planResult] = await Promise.all([
      client.from("technicians").select("*").eq("active", true).order("id"),
      client.from("multipliers").select("*").eq("active", true).order("id"),
      client.from("pricing_plans").select("*").eq("active", true).order("display_order", { ascending: true, nullsFirst: false })
    ]);

    const technicians: Technician[] = (techResult.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      group: String(row.group ?? ""),
      basePrice: Number(row.base_price ?? 0),
      active: true
    }));

    const multipliers: Multiplier[] = (multResult.data ?? []).map((row) => ({
      id: String(row.id),
      category: String(row.category ?? ""),
      name: String(row.name ?? ""),
      multiplier: Number(row.multiplier ?? 1),
      active: true
    }));

    const pricingPlans: PricingPlan[] = (planResult.data ?? []).map((row) => ({
      plan_id: String(row.plan_id ?? ""),
      plan_name: String(row.plan_name ?? ""),
      group: String(row.group ?? ""),
      price: Number(row.price ?? 0),
      active: true,
      display_order: row.display_order ? Number(row.display_order) : undefined
    }));

    if (!technicians.length && !multipliers.length && !pricingPlans.length) {
      return null;
    }

    return { technicians, multipliers, pricingPlans };
  } catch {
    return null;
  }
}
