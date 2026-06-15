import { Technician, PricingPlan, Multiplier } from "@/types";

export function resolveTechnicianPrice(
  technician: Technician,
  planId: string,
  pricingPlans?: PricingPlan[],
  legacyPrice?: number
): number {
  if (pricingPlans && pricingPlans.length > 0) {
    const planPrice = pricingPlans.find(
      (p) => p.plan_id === planId && p.group === technician.group && p.active
    );
    if (planPrice) {
      return planPrice.price;
    }
  }
  return legacyPrice ?? technician.basePrice ?? 0;
}

export function calculateBasePrice(
  technicians: Technician[],
  selectedIds: string[],
  planId: string,
  pricingPlans?: PricingPlan[]
): number {
  return technicians
    .filter((technician) => selectedIds.includes(technician.id))
    .reduce(
      (sum, technician) =>
        sum + resolveTechnicianPrice(technician, planId, pricingPlans, technician.basePrice),
      0
    );
}

export function calculateMultiplier(
  multipliers: Multiplier[],
  selectedIds: string[]
): number {
  return multipliers
    .filter((multiplier) => selectedIds.includes(multiplier.id))
    .reduce((product, item) => product * item.multiplier, 1);
}

export function calculateFinalPrice(basePrice: number, multiplier: number): number {
  return basePrice * multiplier;
}
